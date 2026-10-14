import type { z } from "zod";
import type { submitAssessmentSchema } from "@shared/schemas";
import { prisma } from "../db";
import type { Prisma } from "../generated/prisma/client";
import { conflict, notFound } from "../lib/errors";
import { addActivity, addNotification } from "./feed.service";
import { getProfileOrThrow } from "./profile.service";
import { evidenceHash } from "./scoring";

interface Question {
  prompt: string;
  options: string[];
  answer: number;
}

/** Extra time allowed after the timer ends (slow connections). */
const GRACE_MS = 30_000;

const endsAt = (startedAt: Date, minutes: number) => new Date(startedAt.getTime() + minutes * 60_000);

/** Grades answers against the answer key. Kept separate so it can be unit tested. */
export function gradeAnswers(questions: Question[], answers: number[]) {
  const correct = questions.filter((q, i) => answers[i] === q.answer).length;
  return { correct, total: questions.length, score: Math.round((correct / Math.max(1, questions.length)) * 100) };
}

/** All assessments, with the graduate's status for each. */
export async function listAssessments(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const [assessments, records, attempts] = await Promise.all([
    prisma.assessment.findMany({ include: { skill: true }, orderBy: { title: "asc" } }),
    prisma.skillsRecord.findMany({ where: { profileId: profile.id }, select: { skillId: true, evidenceType: true } }),
    prisma.assessmentAttempt.findMany({
      where: { profileId: profile.id, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
    }),
  ]);
  const verified = new Map(records.map((r) => [r.skillId, r.evidenceType]));
  return assessments.map((a) => {
    const mine = attempts.filter((t) => t.assessmentId === a.id);
    const best = mine.reduce<number | null>((max, t) => (t.score !== null && (max === null || t.score > max) ? t.score : max), null);
    return {
      id: a.id,
      title: a.title,
      skillId: a.skillId,
      skill: a.skill.name,
      category: a.skill.category,
      minutes: a.minutes,
      questionCount: (a.questions as unknown as Question[]).length,
      passMark: a.passMark,
      verified: verified.has(a.skillId),
      verifiedBy: verified.get(a.skillId) ?? null,
      attempts: mine.length,
      bestScore: best,
      lastAttemptAt: mine[0]?.submittedAt?.toISOString() ?? null,
    };
  });
}

/**
 * Starts (or resumes) an attempt. The questions are sent WITHOUT the answers;
 * grading only ever happens on the server.
 */
export async function startAssessment(userId: string, assessmentId: string) {
  const profile = await getProfileOrThrow(userId);
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: { skill: true } });
  if (!assessment) throw notFound("Assessment not found.");

  const verified = await prisma.skillsRecord.findUnique({
    where: { profileId_skillId: { profileId: profile.id, skillId: assessment.skillId } },
  });
  if (verified) throw conflict(`${assessment.skill.name} is already verified.`);

  // Resume an unfinished attempt if there is still time left, otherwise start a new one.
  const open = await prisma.assessmentAttempt.findFirst({
    where: { profileId: profile.id, assessmentId, submittedAt: null },
    orderBy: { startedAt: "desc" },
  });
  const attempt =
    open && endsAt(open.startedAt, assessment.minutes).getTime() > Date.now()
      ? open
      : await prisma.assessmentAttempt.create({ data: { profileId: profile.id, assessmentId } });

  const questions = assessment.questions as unknown as Question[];
  return {
    attemptId: attempt.id,
    assessment: { id: assessment.id, title: assessment.title, skill: assessment.skill.name, minutes: assessment.minutes, passMark: assessment.passMark },
    questions: questions.map((q) => ({ prompt: q.prompt, options: q.options })),
    startedAt: attempt.startedAt.toISOString(),
    endsAt: endsAt(attempt.startedAt, assessment.minutes).toISOString(),
  };
}

/** Grades an attempt. Passing creates a verified SkillsRecord (assessment evidence). */
export async function submitAssessment(userId: string, attemptId: string, data: z.output<typeof submitAssessmentSchema>) {
  const profile = await getProfileOrThrow(userId);
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: { include: { skill: true } } },
  });
  if (!attempt || attempt.profileId !== profile.id) throw notFound("Attempt not found.");
  if (attempt.submittedAt) throw conflict("This attempt has already been submitted.");

  const { assessment } = attempt;
  const questions = assessment.questions as unknown as Question[];
  const submittedAt = new Date();
  const late = submittedAt.getTime() > endsAt(attempt.startedAt, assessment.minutes).getTime() + GRACE_MS;
  const { correct, total, score } = gradeAnswers(questions, data.answers);
  const passed = !late && score >= assessment.passMark;
  const skill = assessment.skill;

  await prisma.$transaction(async (tx) => {
    await tx.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { score, passed, submittedAt, answers: data.answers as Prisma.InputJsonValue },
    });
    if (!passed) return;

    const already = await tx.skillsRecord.findUnique({
      where: { profileId_skillId: { profileId: profile.id, skillId: skill.id } },
    });
    if (already) return;

    await tx.skillsRecord.create({
      data: {
        profileId: profile.id,
        skillId: skill.id,
        evidenceType: "assessment",
        score,
        attemptId: attempt.id,
        verifiedAt: submittedAt,
        evidenceHash: evidenceHash({ profileId: profile.id, skillId: skill.id, evidenceType: "assessment", score, verifiedAt: submittedAt }),
      },
    });
    await tx.profileSkill.upsert({
      where: { profileId_skillId: { profileId: profile.id, skillId: skill.id } },
      update: {},
      create: { profileId: profile.id, skillId: skill.id },
    });
    await addActivity(tx, userId, `${skill.name} skill verified`, `Assessment score ${score}%`, "verified");
    await addNotification(tx, userId, `Your ${skill.name} skill has been verified`, `You scored ${score}% and earned a verified badge.`, "skill");
  });

  return {
    score,
    correct,
    total,
    passMark: assessment.passMark,
    passed,
    late,
    skill: skill.name,
    // Which questions were right. The correct answers are only revealed once you pass.
    review: questions.map((q, i) => ({
      prompt: q.prompt,
      options: q.options,
      chosen: data.answers[i] ?? -1,
      isCorrect: data.answers[i] === q.answer,
      answer: passed ? q.answer : null,
    })),
  };
}
