/**
 * Demo data. Runs every time the API starts (npm run dev):
 *  1. The catalogue (skills, assessments, learning modules, mentors, opportunities) is always brought up to date,
 *     so new content reaches existing databases too.
 *  2. The demo accounts are only added to an empty database (your own accounts and changes are never touched).
 * Start completely fresh with: npm run db:reset
 * All four demo accounts use the password: password123
 */
import { hash } from "@node-rs/argon2";
import { prisma } from "../src/db";
import type { ApplicationStatus } from "../src/generated/prisma/client";
import { evidenceHash } from "../src/services/scoring";
import { extraAssessments, lessonContent } from "./catalog-content";
import { assessments as baseAssessments, learningModules, mentors, opportunities, skills } from "./seed-data";

const assessments = [...baseAssessments, ...extraAssessments];

const daysAgo = (days: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

/** "2 days ago" -> a date 2 days ago */
function fromLabel(label: string) {
  const [n, unit] = label.split(" ");
  return daysAgo(Number(n) * (unit.startsWith("week") ? 7 : 1));
}

/** Lessons with their notes, e.g. [{ title, minutes, content: [...] }] */
function lessonsFor(moduleId: string, lessons: { title: string; minutes: number }[]) {
  return lessons.map((l, i) => ({ title: l.title, minutes: l.minutes, content: lessonContent[moduleId]?.[i] ?? [] }));
}

/** Always runs: inserts or updates the catalogue. */
async function syncCatalogue() {
  for (const s of skills) {
    await prisma.skill.upsert({ where: { id: s.id }, update: { name: s.name, category: s.category }, create: s });
  }
  const skillIdByName = new Map(skills.map((s) => [s.name, s.id]));
  for (const a of assessments) {
    const data = { skillId: skillIdByName.get(a.skill)!, title: a.title, minutes: a.minutes, questions: a.questions };
    await prisma.assessment.upsert({ where: { id: a.id }, update: data, create: { id: a.id, ...data } });
  }
  for (const m of learningModules) {
    const data = {
      title: m.title,
      skill: m.skill,
      track: m.track,
      difficulty: m.difficulty,
      minutes: m.minutes,
      description: m.description,
      objectives: m.objectives,
      lessons: lessonsFor(m.id, m.lessons),
    };
    await prisma.learningModule.upsert({ where: { id: m.id }, update: data, create: { id: m.id, ...data } });
  }
  for (const m of mentors) {
    const data = {
      name: m.name,
      initials: m.initials,
      jobTitle: m.jobTitle,
      company: m.company,
      years: m.years,
      rating: m.rating,
      availability: m.availability,
      bio: m.bio,
      specialisations: m.specialisations,
      languages: m.languages,
      slots: m.slots,
    };
    await prisma.mentor.upsert({ where: { id: m.id }, update: data, create: { id: m.id, sessionsCount: m.sessions, ...data } });
  }
  for (const name of [...new Set(opportunities.map((o) => o.company))]) {
    await prisma.employer.upsert({ where: { name }, update: {}, create: { name } });
  }
  const employers = await prisma.employer.findMany();
  const employerId = new Map(employers.map((e) => [e.name, e.id]));
  for (const o of opportunities) {
    const data = {
      employerId: employerId.get(o.company)!,
      title: o.title,
      type: o.type,
      location: o.location,
      workMode: o.workMode,
      experience: o.experience,
      salary: o.salary,
      description: o.description,
      skills: o.skills,
      responsibilities: o.responsibilities,
      requirements: o.requirements,
    };
    await prisma.opportunity.upsert({ where: { id: o.id }, update: data, create: { id: o.id, postedAt: fromLabel(o.postedDate), ...data } });
  }
}

async function main() {
  await syncCatalogue();
  if ((await prisma.user.count()) > 0) {
    console.log("[seed] Catalogue up to date. Demo accounts already exist, not changing them.");
    return;
  }
  console.log("[seed] Adding demo accounts...");
  const passwordHash = await hash("password123");
  const consent = daysAgo(90);

  // ----- Demo users -----
  const thandi = await prisma.user.create({
    data: {
      email: "thandi.nkosi@example.co.za",
      passwordHash,
      firstName: "Thandi",
      lastName: "Nkosi",
      role: "graduate",
      termsAcceptedAt: consent,
      popiaConsentAt: consent,
      profile: {
        create: {
          headline: "BSc IT Graduate · Aspiring Software Developer",
          institution: "University of Johannesburg",
          qualification: "BSc Information Technology",
          graduationYear: "2025",
          location: "Johannesburg, Gauteng",
          careerInterest: "Software Development",
          githubUrl: "github.com/thandin",
          websiteUrl: "thandi.dev",
          onboarded: true,
          completeness: 80,
        },
      },
    },
    include: { profile: true },
  });
  const lerato = await prisma.user.create({
    data: { email: "lerato@technova.example", passwordHash, firstName: "Lerato", lastName: "Dube", role: "employer", termsAcceptedAt: consent, popiaConsentAt: consent },
  });
  const sipho = await prisma.user.create({
    data: { email: "sipho@example.co.za", passwordHash, firstName: "Sipho", lastName: "Mokoena", role: "mentor", termsAcceptedAt: consent, popiaConsentAt: consent },
  });
  await prisma.user.create({
    data: { email: "admin@gradconnect.example", passwordHash, firstName: "Naledi", lastName: "Khumalo", role: "admin", termsAcceptedAt: consent, popiaConsentAt: consent },
  });

  // ----- Link Sipho's account to his mentor profile, and TechNova to Lerato -----
  await prisma.mentor.update({ where: { id: "m-1" }, data: { userId: sipho.id } });
  await prisma.employer.update({ where: { name: "TechNova" }, data: { userId: lerato.id } });

  // ----- Thandi's skills: 7 declared, 3 of them verified -----
  const profileId = thandi.profile!.id;
  await prisma.profileSkill.createMany({
    data: ["csharp", "sql", "restapis", "javascript", "react", "docker", "git"].map((skillId) => ({ profileId, skillId })),
  });
  const artefact = await prisma.projectArtefact.create({
    data: {
      profileId,
      name: "Campus Marketplace API",
      description: "REST API built in .NET Core with JWT authentication, PostgreSQL and Swagger docs.",
      repoUrl: "github.com/thandin/campus-marketplace-api",
      createdAt: daysAgo(55),
    },
  });
  const records = [
    { skillId: "csharp", evidenceType: "assessment" as const, score: 84, verifiedAt: daysAgo(17) },
    { skillId: "sql", evidenceType: "assessment" as const, score: 78, verifiedAt: daysAgo(27) },
    { skillId: "restapis", evidenceType: "project" as const, artefactId: artefact.id, verifiedAt: daysAgo(36) },
  ];
  for (const r of records) {
    await prisma.skillsRecord.create({ data: { profileId, ...r, evidenceHash: evidenceHash({ profileId, ...r }) } });
  }

  // ----- Learning progress -----
  await prisma.moduleEnrolment.createMany({
    data: learningModules
      .filter((m) => m.lessons.some((l) => l.done))
      .map((m) => {
        const completedLessons = m.lessons.flatMap((l, i) => (l.done ? [i] : []));
        const progress = Math.round((completedLessons.length / m.lessons.length) * 100);
        return { profileId, moduleId: m.id, completedLessons, progress, completedAt: progress === 100 ? daysAgo(40) : null };
      }),
  });

  // ----- Mentor session, applications, activity, notifications -----
  await prisma.mentorSession.create({
    data: { mentorId: "m-2", profileId, topic: "React", goal: "Portfolio review before applications", day: "Thu", time: "17:00" },
  });

  const snapshot = {
    name: "Thandi Nkosi",
    email: thandi.email,
    headline: "BSc IT Graduate · Aspiring Software Developer",
    verifiedSkills: ["C#", "SQL", "REST APIs"],
    declaredSkills: ["JavaScript", "React", "Docker", "Git"],
  };
  const apps: [string, ApplicationStatus, number][] = [
    ["opp-2", "under_review", 15],
    ["opp-3", "interview", 21],
    ["opp-6", "rejected", 31],
  ];
  for (const [opportunityId, status, ago] of apps) {
    await prisma.application.create({ data: { profileId, opportunityId, status, profileSnapshot: snapshot, appliedAt: daysAgo(ago) } });
  }

  await prisma.activity.createMany({
    data: [
      { userId: thandi.id, label: "C# skill verified", detail: "Assessment score 84%", kind: "verified", createdAt: daysAgo(17) },
      { userId: thandi.id, label: "Applied for Graduate .NET Developer", detail: "Sandton Digital", kind: "applied", createdAt: daysAgo(15) },
      { userId: thandi.id, label: "Completed React Fundamentals lesson 3", detail: "Lists, keys and forms", kind: "learning", createdAt: daysAgo(19) },
      { userId: thandi.id, label: "Booked mentor session", detail: "Aisha Patel · Portfolio review", kind: "mentor", createdAt: daysAgo(23) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: thandi.id, title: "Your JavaScript assessment is ready", body: "15 minutes, 6 questions. Verify the skill on your profile.", kind: "assessment", createdAt: daysAgo(0, 7) },
      { userId: thandi.id, title: "Your C# skill has been verified", body: "You scored 84% and earned a verified badge.", kind: "skill", createdAt: daysAgo(1) },
      { userId: thandi.id, title: "Aisha Patel accepted your booking", body: "Thursday 17:00 · Portfolio review", kind: "mentor", createdAt: daysAgo(2) },
      { userId: thandi.id, title: "Application status changed", body: "Cape Insight Analytics moved you to Interview.", kind: "application", createdAt: daysAgo(4), readAt: daysAgo(3) },
      { userId: thandi.id, title: "New opportunity matches your profile", body: "Junior Software Developer at TechNova — 92% match.", kind: "opportunity", createdAt: daysAgo(5), readAt: daysAgo(4) },
    ],
  });

  console.log("[seed] Done. Log in as thandi.nkosi@example.co.za / password123");
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
