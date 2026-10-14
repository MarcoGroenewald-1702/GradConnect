import { prisma } from "../db";
import { badRequest, notFound } from "../lib/errors";
import { addActivity, addNotification } from "./feed.service";
import { getProfileOrThrow, skillsFor } from "./profile.service";

interface Lesson {
  title: string;
  minutes: number;
  content: string[];
}

const lessonsOf = (json: unknown) => (Array.isArray(json) ? (json as Lesson[]) : []);

/** Progress in percent from the number of finished lessons. */
export const progressFor = (completed: number, total: number) => (total === 0 ? 0 : Math.round((completed / total) * 100));

/** Learning catalogue with the graduate's progress. Recommended = closes a gap in their verified skills. */
export async function listModules(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const [modules, enrolments, skills] = await Promise.all([
    prisma.learningModule.findMany({ orderBy: { title: "asc" } }),
    prisma.moduleEnrolment.findMany({ where: { profileId: profile.id } }),
    skillsFor(profile.id),
  ]);
  const byModule = new Map(enrolments.map((e) => [e.moduleId, e]));
  const declaredOnly = new Set(skills.declared.map((s) => s.name.toLowerCase()));
  const verified = new Set(skills.verified.map((s) => s.name.toLowerCase()));

  return modules
    .map((m) => {
      const e = byModule.get(m.id);
      const lessons = lessonsOf(m.lessons);
      const skill = m.skill.toLowerCase();
      return {
        id: m.id,
        title: m.title,
        skill: m.skill,
        track: m.track,
        difficulty: m.difficulty,
        minutes: m.minutes,
        description: m.description,
        lessonCount: lessons.length,
        completedCount: e?.completedLessons.length ?? 0,
        progress: e?.progress ?? 0,
        enrolled: !!e,
        completed: !!e?.completedAt,
        recommended: !e?.completedAt && (declaredOnly.has(skill) || (!verified.has(skill) && !!e)),
      };
    })
    .sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

export async function getModule(userId: string, moduleId: string) {
  const profile = await getProfileOrThrow(userId);
  const module = await prisma.learningModule.findUnique({ where: { id: moduleId } });
  if (!module) throw notFound("Module not found.");
  const enrolment = await prisma.moduleEnrolment.findUnique({
    where: { profileId_moduleId: { profileId: profile.id, moduleId } },
  });
  const done = new Set(enrolment?.completedLessons ?? []);
  return {
    id: module.id,
    title: module.title,
    skill: module.skill,
    track: module.track,
    difficulty: module.difficulty,
    minutes: module.minutes,
    description: module.description,
    objectives: module.objectives,
    lessons: lessonsOf(module.lessons).map((l, i) => ({ ...l, index: i, done: done.has(i) })),
    enrolled: !!enrolment,
    progress: enrolment?.progress ?? 0,
    completedAt: enrolment?.completedAt?.toISOString() ?? null,
  };
}

/** Marks a lesson as finished (done = true) or not finished (done = false), and updates progress. */
export async function setLessonDone(userId: string, moduleId: string, index: number, done: boolean) {
  const profile = await getProfileOrThrow(userId);
  const module = await prisma.learningModule.findUnique({ where: { id: moduleId } });
  if (!module) throw notFound("Module not found.");
  const lessons = lessonsOf(module.lessons);
  if (!Number.isInteger(index) || index < 0 || index >= lessons.length) throw badRequest("Unknown lesson.");

  const key = { profileId_moduleId: { profileId: profile.id, moduleId } };
  const existing = await prisma.moduleEnrolment.findUnique({ where: key });
  const set = new Set(existing?.completedLessons ?? []);
  const wasDone = set.has(index);
  if (done) set.add(index);
  else set.delete(index);
  const completedLessons = [...set].sort((a, b) => a - b);
  const progress = progressFor(completedLessons.length, lessons.length);
  const nowComplete = progress === 100;
  const justCompleted = nowComplete && !existing?.completedAt;

  await prisma.$transaction(async (tx) => {
    await tx.moduleEnrolment.upsert({
      where: key,
      update: { completedLessons, progress, completedAt: nowComplete ? (existing?.completedAt ?? new Date()) : null },
      create: { profileId: profile.id, moduleId, completedLessons, progress, completedAt: nowComplete ? new Date() : null },
    });
    if (done && !wasDone) {
      await addActivity(tx, userId, `Completed ${module.title} lesson ${index + 1}`, lessons[index].title, "learning");
    }
    if (justCompleted) {
      await addNotification(tx, userId, `You finished ${module.title}`, "Your learning score has gone up. Ready to verify the skill?", "learning");
    }
  });
  return getModule(userId, moduleId);
}

/** Enrols in a module (progress starts at 0). */
export async function enrol(userId: string, moduleId: string) {
  const profile = await getProfileOrThrow(userId);
  const module = await prisma.learningModule.findUnique({ where: { id: moduleId } });
  if (!module) throw notFound("Module not found.");
  await prisma.moduleEnrolment.upsert({
    where: { profileId_moduleId: { profileId: profile.id, moduleId } },
    update: {},
    create: { profileId: profile.id, moduleId },
  });
  return getModule(userId, moduleId);
}
