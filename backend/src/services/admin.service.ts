import { prisma } from "../db";
import type { Role } from "../generated/prisma/client";

/** Platform-wide numbers for the admin overview. Read-only. */
export async function adminOverview() {
  const [
    roles,
    profiles,
    visible,
    records,
    attempts,
    assessments,
    applications,
    sessions,
    opportunities,
    enrolments,
    recentUsers,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.profile.groupBy({ by: ["onboarded"], _count: { _all: true } }),
    prisma.profile.count({ where: { visibleToEmployers: true } }),
    prisma.skillsRecord.groupBy({ by: ["evidenceType"], _count: { _all: true } }),
    prisma.assessmentAttempt.findMany({ where: { submittedAt: { not: null } }, select: { assessmentId: true, passed: true, score: true } }),
    prisma.assessment.findMany({ include: { skill: true }, orderBy: { title: "asc" } }),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.mentorSession.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.opportunity.groupBy({ by: ["isOpen"], _count: { _all: true } }),
    prisma.moduleEnrolment.findMany({ select: { progress: true, completedAt: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const count = <T extends { _count: { _all: number } }>(rows: T[], match: (r: T) => boolean) =>
    rows.filter(match).reduce((sum, r) => sum + r._count._all, 0);

  return {
    users: {
      total: roles.reduce((sum, r) => sum + r._count._all, 0),
      byRole: Object.fromEntries(roles.map((r) => [r.role, r._count._all])) as Partial<Record<Role, number>>,
      onboarded: count(profiles, (p) => p.onboarded),
      visibleToEmployers: visible,
    },
    verifiedSkills: {
      total: records.reduce((sum, r) => sum + r._count._all, 0),
      byAssessment: count(records, (r) => r.evidenceType === "assessment"),
      byProject: count(records, (r) => r.evidenceType === "project"),
    },
    assessments: assessments.map((a) => {
      const mine = attempts.filter((t) => t.assessmentId === a.id);
      const passed = mine.filter((t) => t.passed).length;
      const avg = mine.length ? Math.round(mine.reduce((s, t) => s + (t.score ?? 0), 0) / mine.length) : null;
      return { id: a.id, title: a.title, skill: a.skill.name, attempts: mine.length, passed, passRate: mine.length ? Math.round((passed / mine.length) * 100) : null, averageScore: avg };
    }),
    applications: Object.fromEntries(applications.map((a) => [a.status, a._count._all])),
    sessions: Object.fromEntries(sessions.map((s) => [s.status, s._count._all])),
    opportunities: { open: count(opportunities, (o) => o.isOpen), closed: count(opportunities, (o) => !o.isOpen) },
    learning: {
      enrolments: enrolments.length,
      completed: enrolments.filter((e) => e.completedAt).length,
      averageProgress: enrolments.length ? Math.round(enrolments.reduce((s, e) => s + e.progress, 0) / enrolments.length) : 0,
    },
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
    })),
  };
}

export async function listUsers(role?: Role) {
  const users = await prisma.user.findMany({
    where: role ? { role } : {},
    include: { profile: { select: { onboarded: true, completeness: true, visibleToEmployers: true } }, employer: true, mentor: true },
    orderBy: { createdAt: "desc" },
  });
  return users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    detail:
      u.role === "graduate"
        ? `${u.profile?.onboarded ? "Onboarded" : "Not onboarded"} · profile ${u.profile?.completeness ?? 0}%${u.profile?.visibleToEmployers ? " · visible to employers" : ""}`
        : u.role === "employer"
          ? (u.employer?.name ?? "")
          : u.role === "mentor"
            ? `${u.mentor?.jobTitle ?? ""}${u.mentor?.company ? `, ${u.mentor.company}` : ""}`
            : "Administrator",
  }));
}
