import type { z } from "zod";
import type { onboardingSchema, profileUpdateSchema } from "@shared/schemas";
import { prisma } from "../db";
import { forbidden } from "../lib/errors";
import { getUserDto } from "./auth.service";
import { calculateCompleteness, calculateReadiness } from "./scoring";

/** A graduate's profile. Only graduates have one. */
export async function getProfileOrThrow(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw forbidden("Only graduate accounts have a profile.");
  return profile;
}

/** Readiness score for a profile (see scoring.ts for the formula). */
export async function readinessFor(profileId: string, completeness: number) {
  const [verifiedSkills, modules, enrolments] = await Promise.all([
    prisma.skillsRecord.count({ where: { profileId } }),
    prisma.learningModule.count(),
    prisma.moduleEnrolment.findMany({ where: { profileId }, select: { progress: true } }),
  ]);
  // average over ALL modules; modules not started count as 0
  const learning = modules === 0 ? 0 : enrolments.reduce((sum, e) => sum + e.progress, 0) / modules;
  return calculateReadiness(completeness, verifiedSkills, learning);
}

/** Verified + self-declared skills for a profile. */
export async function skillsFor(profileId: string) {
  const [records, declared] = await Promise.all([
    prisma.skillsRecord.findMany({
      where: { profileId },
      include: { skill: true, artefact: true },
      orderBy: { verifiedAt: "desc" },
    }),
    prisma.profileSkill.findMany({ where: { profileId }, include: { skill: true }, orderBy: { declaredAt: "asc" } }),
  ]);
  const verifiedIds = new Set(records.map((r) => r.skillId));
  return {
    records,
    verified: records.map((r) => ({
      skillId: r.skillId,
      name: r.skill.name,
      category: r.skill.category,
      verified: true,
      method: r.evidenceType,
      score: r.score,
      verifiedOn: r.verifiedAt.toISOString(),
    })),
    declared: declared
      .filter((d) => !verifiedIds.has(d.skillId))
      .map((d) => ({
        skillId: d.skillId,
        name: d.skill.name,
        category: d.skill.category,
        verified: false,
        method: null,
        score: null,
        verifiedOn: null,
      })),
  };
}

export async function getProfile(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const [user, skills, artefacts, readiness] = await Promise.all([
    getUserDto(userId),
    skillsFor(profile.id),
    prisma.projectArtefact.findMany({
      where: { profileId: profile.id },
      include: { skillsRecords: { include: { skill: true } } },
      orderBy: { createdAt: "desc" },
    }),
    readinessFor(profile.id, profile.completeness),
  ]);
  return {
    user,
    verifiedSkills: skills.verified,
    declaredSkills: skills.declared,
    projects: artefacts.map((a) => ({
      name: a.name,
      description: a.description,
      repo: a.repoUrl,
      skill: a.skillsRecords[0]?.skill.name ?? null,
    })),
    readiness,
  };
}

export async function updateProfile(userId: string, data: z.output<typeof profileUpdateSchema>) {
  const profile = await getProfileOrThrow(userId);
  await prisma.profile.update({ where: { id: profile.id }, data });
  return getUserDto(userId);
}

export async function completeOnboarding(userId: string, data: z.output<typeof onboardingSchema>) {
  const profile = await getProfileOrThrow(userId);
  const validSkills = await prisma.skill.findMany({ where: { id: { in: data.skillIds } }, select: { id: true } });

  const completeness = calculateCompleteness([
    !!(data.headline || data.location),
    !!(data.institution && data.qualification),
    validSkills.length > 0,
    !!data.careerInterest,
    !!(data.githubUrl || data.websiteUrl),
  ]);

  await prisma.$transaction([
    prisma.profile.update({
      where: { id: profile.id },
      data: {
        headline: data.headline ?? "IT Graduate",
        location: data.location,
        bio: data.bio,
        institution: data.institution,
        qualification: data.qualification,
        graduationYear: data.graduationYear,
        careerInterest: data.careerInterest,
        targetRole: data.targetRole,
        githubUrl: data.githubUrl,
        websiteUrl: data.websiteUrl,
        visibleToEmployers: data.visibleToEmployers,
        onboarded: true,
        completeness,
      },
    }),
    prisma.profileSkill.createMany({
      data: validSkills.map((s) => ({ profileId: profile.id, skillId: s.id })),
      skipDuplicates: true,
    }),
  ]);
  return getUserDto(userId);
}

/** POPIA: the graduate decides whether employers can find their profile. */
export async function setVisibility(userId: string, visibleToEmployers: boolean) {
  const profile = await getProfileOrThrow(userId);
  await prisma.profile.update({ where: { id: profile.id }, data: { visibleToEmployers } });
  return getUserDto(userId);
}
