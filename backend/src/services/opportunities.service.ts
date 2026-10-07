import type { z } from "zod";
import type { applySchema } from "@shared/schemas";
import { prisma } from "../db";
import type { Opportunity, Prisma } from "../generated/prisma/client";
import { conflict, notFound } from "../lib/errors";
import { getUserDto } from "./auth.service";
import { addActivity, addNotification } from "./feed.service";
import { getProfileOrThrow, readinessFor, skillsFor } from "./profile.service";
import { calculateMatch } from "./scoring";

const STATUS_LABEL = {
  submitted: "Submitted",
  under_review: "Under Review",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
} as const;

/** "2 days ago", "1 week ago" ... */
function postedLabel(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

/** The graduate's verified and declared skill names (lower case) for match scoring. */
async function skillSets(profileId: string) {
  const { verified, declared } = await skillsFor(profileId);
  return {
    verified: new Set(verified.map((s) => s.name.toLowerCase())),
    declared: new Set(declared.map((s) => s.name.toLowerCase())),
  };
}

type OppWithEmployer = Opportunity & { employer: { name: string } };

function toDto(o: OppWithEmployer, match: number, saved: boolean, applied: boolean) {
  return {
    id: o.id,
    title: o.title,
    company: o.employer.name,
    location: o.location,
    workMode: o.workMode,
    type: o.type,
    match,
    skills: o.skills,
    postedDate: postedLabel(o.postedAt),
    experience: o.experience,
    salary: o.salary,
    description: o.description,
    responsibilities: o.responsibilities,
    requirements: o.requirements,
    saved,
    applied,
  };
}

/** All opportunities with the graduate's personal match %, best match first. */
export async function listOpportunities(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const [opps, sets, saved, applied] = await Promise.all([
    prisma.opportunity.findMany({ include: { employer: { select: { name: true } } }, orderBy: { postedAt: "desc" } }),
    skillSets(profile.id),
    prisma.savedOpportunity.findMany({ where: { profileId: profile.id }, select: { opportunityId: true } }),
    prisma.application.findMany({ where: { profileId: profile.id }, select: { opportunityId: true } }),
  ]);
  const savedIds = new Set(saved.map((s) => s.opportunityId));
  const appliedIds = new Set(applied.map((a) => a.opportunityId));
  return opps
    .map((o) =>
      toDto(o, calculateMatch(o.skills, sets.verified, sets.declared), savedIds.has(o.id), appliedIds.has(o.id)),
    )
    .sort((a, b) => b.match - a.match);
}

export async function getOpportunity(userId: string, id: string) {
  const profile = await getProfileOrThrow(userId);
  const o = await prisma.opportunity.findUnique({ where: { id }, include: { employer: { select: { name: true } } } });
  if (!o) throw notFound("Opportunity not found.");
  const sets = await skillSets(profile.id);
  const [saved, applied] = await Promise.all([
    prisma.savedOpportunity.findUnique({ where: { profileId_opportunityId: { profileId: profile.id, opportunityId: id } } }),
    prisma.application.findUnique({ where: { profileId_opportunityId: { profileId: profile.id, opportunityId: id } } }),
  ]);
  return toDto(o, calculateMatch(o.skills, sets.verified, sets.declared), !!saved, !!applied);
}

/** Saves the opportunity, or un-saves it if it was already saved. */
export async function toggleSaved(userId: string, opportunityId: string) {
  const profile = await getProfileOrThrow(userId);
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp) throw notFound("Opportunity not found.");
  const key = { profileId_opportunityId: { profileId: profile.id, opportunityId } };
  const existing = await prisma.savedOpportunity.findUnique({ where: key });
  if (existing) {
    await prisma.savedOpportunity.delete({ where: key });
    return { saved: false };
  }
  await prisma.savedOpportunity.create({ data: { profileId: profile.id, opportunityId } });
  return { saved: true };
}

/** What the employer receives: a frozen copy of the profile at the moment of applying. */
export async function buildProfileSnapshot(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const [user, skills, readiness] = await Promise.all([
    getUserDto(userId),
    skillsFor(profile.id),
    readinessFor(profile.id, profile.completeness),
  ]);
  return {
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    headline: user.headline,
    location: user.location,
    institution: user.institution,
    qualification: user.qualification,
    graduationYear: user.graduationYear,
    careerInterest: user.careerInterest,
    githubUrl: user.githubUrl,
    websiteUrl: user.websiteUrl,
    verifiedSkills: skills.verified.map((s) => ({ name: s.name, method: s.method, verifiedOn: s.verifiedOn })),
    declaredSkills: skills.declared.map((s) => s.name),
    readinessScore: readiness.total,
    takenAt: new Date().toISOString(),
  };
}

export async function apply(userId: string, opportunityId: string, data: z.output<typeof applySchema>) {
  const profile = await getProfileOrThrow(userId);
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId }, include: { employer: true } });
  if (!opp) throw notFound("Opportunity not found.");
  const existing = await prisma.application.findUnique({
    where: { profileId_opportunityId: { profileId: profile.id, opportunityId } },
  });
  if (existing) throw conflict("You have already applied for this opportunity.");

  const snapshot = await buildProfileSnapshot(userId);
  await prisma.$transaction(async (tx) => {
    await tx.application.create({
      data: {
        profileId: profile.id,
        opportunityId,
        coverNote: data.coverNote,
        profileSnapshot: snapshot as Prisma.InputJsonObject,
      },
    });
    await addActivity(tx, userId, `Applied for ${opp.title}`, opp.employer.name, "applied");
    await addNotification(tx, userId, "Application submitted", `${opp.title} at ${opp.employer.name}.`, "application");
  });
  return (await listApplications(userId)).find((a) => a.opportunityId === opportunityId)!;
}

export async function listApplications(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const [apps, sets] = await Promise.all([
    prisma.application.findMany({
      where: { profileId: profile.id },
      include: { opportunity: { include: { employer: { select: { name: true } } } } },
      orderBy: { appliedAt: "desc" },
    }),
    skillSets(profile.id),
  ]);
  return apps.map((a) => ({
    id: a.id,
    opportunityId: a.opportunityId,
    title: a.opportunity.title,
    company: a.opportunity.employer.name,
    appliedOn: a.appliedAt.toISOString(),
    match: calculateMatch(a.opportunity.skills, sets.verified, sets.declared),
    status: STATUS_LABEL[a.status],
    coverNote: a.coverNote,
  }));
}
