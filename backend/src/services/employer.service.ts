import crypto from "node:crypto";
import type { z } from "zod";
import type { applicationStatusSchema, opportunitySchema, shortlistSchema } from "@shared/schemas";
import { prisma } from "../db";
import type { Prisma } from "../generated/prisma/client";
import { conflict, forbidden, notFound } from "../lib/errors";
import { addNotification } from "./feed.service";
import { STATUS_LABEL } from "./opportunities.service";
import { readinessFor, skillsFor } from "./profile.service";
import { calculateMatch } from "./scoring";

async function myEmployerOrThrow(userId: string) {
  const employer = await prisma.employer.findUnique({ where: { userId } });
  if (!employer) throw forbidden("Only employer accounts can do this.");
  return employer;
}

async function myOpportunityOrThrow(userId: string, opportunityId: string) {
  const employer = await myEmployerOrThrow(userId);
  const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp || opp.employerId !== employer.id) throw notFound("Opportunity not found.");
  return { employer, opp };
}

/** Verified + declared skill names (lower case) for a profile, for match scoring. */
async function skillSetsFor(profileId: string) {
  const { verified, declared } = await skillsFor(profileId);
  return {
    verified,
    declared,
    verifiedSet: new Set(verified.map((s) => s.name.toLowerCase())),
    declaredSet: new Set(declared.map((s) => s.name.toLowerCase())),
  };
}

// ---------- Dashboard ----------

export async function employerOverview(userId: string) {
  const employer = await myEmployerOrThrow(userId);
  const [opps, applications, shortlisted] = await Promise.all([
    prisma.opportunity.findMany({ where: { employerId: employer.id }, include: { _count: { select: { applications: true } } } }),
    prisma.application.findMany({
      where: { opportunity: { employerId: employer.id } },
      include: { opportunity: true, profile: { include: { user: true } } },
      orderBy: { appliedAt: "desc" },
    }),
    prisma.shortlist.count({ where: { employerId: employer.id } }),
  ]);
  const byStatus = (status: string) => applications.filter((a) => a.status === status).length;
  return {
    employer: { name: employer.name, industry: employer.industry },
    stats: {
      openOpportunities: opps.filter((o) => o.isOpen).length,
      applications: applications.length,
      newApplications: byStatus("submitted"),
      interviews: byStatus("interview"),
      shortlisted,
    },
    recentApplications: applications.slice(0, 6).map((a) => ({
      id: a.id,
      opportunityId: a.opportunityId,
      opportunityTitle: a.opportunity.title,
      candidate: `${a.profile.user.firstName} ${a.profile.user.lastName}`,
      initials: `${a.profile.user.firstName[0]}${a.profile.user.lastName[0]}`.toUpperCase(),
      status: STATUS_LABEL[a.status],
      appliedAt: a.appliedAt.toISOString(),
    })),
    opportunities: opps.map((o) => ({ id: o.id, title: o.title, isOpen: o.isOpen, applications: o._count.applications })),
  };
}

// ---------- Opportunities (create, edit, open/close, delete) ----------

export async function listMyOpportunities(userId: string) {
  const employer = await myEmployerOrThrow(userId);
  const opps = await prisma.opportunity.findMany({
    where: { employerId: employer.id },
    include: { applications: { select: { status: true } } },
    orderBy: { postedAt: "desc" },
  });
  return opps.map((o) => ({
    id: o.id,
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
    isOpen: o.isOpen,
    postedAt: o.postedAt.toISOString(),
    applications: o.applications.length,
    newApplications: o.applications.filter((a) => a.status === "submitted").length,
  }));
}

export async function createOpportunity(userId: string, data: z.output<typeof opportunitySchema>) {
  const employer = await myEmployerOrThrow(userId);
  const opp = await prisma.opportunity.create({
    data: { id: `opp-${crypto.randomUUID().slice(0, 8)}`, employerId: employer.id, ...data },
  });
  return opp.id;
}

export async function updateOpportunity(userId: string, opportunityId: string, data: z.output<typeof opportunitySchema>) {
  await myOpportunityOrThrow(userId, opportunityId);
  await prisma.opportunity.update({ where: { id: opportunityId }, data });
}

/** Open or close an opportunity. Closed ones are hidden from graduates. */
export async function setOpportunityOpen(userId: string, opportunityId: string, isOpen: boolean) {
  await myOpportunityOrThrow(userId, opportunityId);
  await prisma.opportunity.update({ where: { id: opportunityId }, data: { isOpen } });
}

export async function deleteOpportunity(userId: string, opportunityId: string) {
  await myOpportunityOrThrow(userId, opportunityId);
  const count = await prisma.application.count({ where: { opportunityId } });
  if (count > 0) throw conflict("This opportunity has applications. Close it instead of deleting it.");
  await prisma.$transaction([
    prisma.savedOpportunity.deleteMany({ where: { opportunityId } }),
    prisma.opportunity.delete({ where: { id: opportunityId } }),
  ]);
}

// ---------- Applicants ----------

export async function listApplicants(userId: string, opportunityId: string) {
  const { opp } = await myOpportunityOrThrow(userId, opportunityId);
  const apps = await prisma.application.findMany({
    where: { opportunityId },
    include: { profile: { include: { user: true } } },
    orderBy: { appliedAt: "desc" },
  });
  const rows = await Promise.all(
    apps.map(async (a) => {
      const sets = await skillSetsFor(a.profileId);
      return {
        id: a.id,
        profileId: a.profileId,
        candidate: `${a.profile.user.firstName} ${a.profile.user.lastName}`,
        initials: `${a.profile.user.firstName[0]}${a.profile.user.lastName[0]}`.toUpperCase(),
        status: a.status,
        statusLabel: STATUS_LABEL[a.status],
        coverNote: a.coverNote,
        appliedAt: a.appliedAt.toISOString(),
        // live match using the candidate's current skills
        match: calculateMatch(opp.skills, sets.verifiedSet, sets.declaredSet),
        // what the candidate sent at the moment of applying
        snapshot: a.profileSnapshot as Prisma.JsonObject,
      };
    }),
  );
  return {
    opportunity: { id: opp.id, title: opp.title, skills: opp.skills, isOpen: opp.isOpen },
    applicants: rows,
  };
}

export async function setApplicationStatus(userId: string, applicationId: string, data: z.output<typeof applicationStatusSchema>) {
  const employer = await myEmployerOrThrow(userId);
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { opportunity: true, profile: true },
  });
  if (!app || app.opportunity.employerId !== employer.id) throw notFound("Application not found.");
  if (app.status === data.status) return;
  await prisma.$transaction(async (tx) => {
    await tx.application.update({ where: { id: applicationId }, data: { status: data.status } });
    await addNotification(
      tx,
      app.profile.userId,
      "Application status changed",
      `${employer.name} moved your ${app.opportunity.title} application to ${STATUS_LABEL[data.status]}.`,
      "application",
    );
  });
}

// ---------- Candidate discovery (design doc 4.3.5) ----------

export interface CandidateFilters {
  skills: string[];
  location?: string;
  graduationYear?: string;
  verifiedOnly?: boolean;
}

/**
 * Graduates who opted in to being found (POPIA), ranked by match against the chosen skills.
 * Verified and self-declared skills are always shown separately.
 */
export async function searchCandidates(userId: string, filters: CandidateFilters) {
  const employer = await myEmployerOrThrow(userId);
  const [profiles, shortlist] = await Promise.all([
    prisma.profile.findMany({
      where: {
        visibleToEmployers: true,
        onboarded: true,
        ...(filters.location ? { location: { contains: filters.location, mode: "insensitive" } } : {}),
        ...(filters.graduationYear ? { graduationYear: filters.graduationYear } : {}),
      },
      include: { user: true },
    }),
    prisma.shortlist.findMany({ where: { employerId: employer.id }, select: { profileId: true } }),
  ]);
  const shortlisted = new Set(shortlist.map((s) => s.profileId));

  const rows = await Promise.all(
    profiles.map(async (p) => {
      const sets = await skillSetsFor(p.id);
      const readiness = await readinessFor(p.id, p.completeness);
      const wanted = filters.skills;
      const hasAllVerified = wanted.every((s) => sets.verifiedSet.has(s.toLowerCase()));
      return {
        profileId: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        initials: `${p.user.firstName[0]}${p.user.lastName[0]}`.toUpperCase(),
        headline: p.headline,
        location: p.location,
        institution: p.institution,
        qualification: p.qualification,
        graduationYear: p.graduationYear,
        careerInterest: p.careerInterest,
        verifiedSkills: sets.verified.map((s) => s.name),
        declaredSkills: sets.declared.map((s) => s.name),
        readiness: readiness.total,
        match: wanted.length ? calculateMatch(wanted, sets.verifiedSet, sets.declaredSet) : null,
        shortlisted: shortlisted.has(p.id),
        hasAllVerified,
      };
    }),
  );

  return rows
    .filter((r) => !filters.verifiedOnly || !filters.skills.length || r.hasAllVerified)
    .sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || b.readiness - a.readiness);
}

/** Full candidate profile. Allowed if they opted in, or applied to one of this employer's opportunities. */
export async function getCandidate(userId: string, profileId: string) {
  const employer = await myEmployerOrThrow(userId);
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, include: { user: true } });
  if (!profile) throw notFound("Candidate not found.");
  const applied = await prisma.application.count({ where: { profileId, opportunity: { employerId: employer.id } } });
  if (!profile.visibleToEmployers && applied === 0) throw forbidden("This graduate's profile is private.");

  const [sets, artefacts, readiness, shortlist] = await Promise.all([
    skillSetsFor(profileId),
    prisma.projectArtefact.findMany({ where: { profileId }, include: { skillsRecords: { include: { skill: true } } } }),
    readinessFor(profileId, profile.completeness),
    prisma.shortlist.findUnique({ where: { employerId_profileId: { employerId: employer.id, profileId } } }),
  ]);
  return {
    profileId,
    name: `${profile.user.firstName} ${profile.user.lastName}`,
    initials: `${profile.user.firstName[0]}${profile.user.lastName[0]}`.toUpperCase(),
    email: profile.user.email,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.location,
    institution: profile.institution,
    qualification: profile.qualification,
    graduationYear: profile.graduationYear,
    careerInterest: profile.careerInterest,
    githubUrl: profile.githubUrl,
    websiteUrl: profile.websiteUrl,
    readiness,
    verifiedSkills: sets.verified.map((s) => ({ name: s.name, method: s.method, score: s.score, verifiedOn: s.verifiedOn })),
    declaredSkills: sets.declared.map((s) => s.name),
    projects: artefacts.map((a) => ({
      name: a.name,
      description: a.description,
      repo: a.repoUrl,
      skill: a.skillsRecords[0]?.skill.name ?? null,
    })),
    shortlisted: !!shortlist,
    note: shortlist?.note ?? null,
  };
}

// ---------- Shortlist ----------

export async function addToShortlist(userId: string, data: z.output<typeof shortlistSchema>) {
  const employer = await myEmployerOrThrow(userId);
  await getCandidate(userId, data.profileId); // checks the profile exists and may be viewed
  await prisma.shortlist.upsert({
    where: { employerId_profileId: { employerId: employer.id, profileId: data.profileId } },
    update: { note: data.note },
    create: { employerId: employer.id, profileId: data.profileId, note: data.note },
  });
}

export async function removeFromShortlist(userId: string, profileId: string) {
  const employer = await myEmployerOrThrow(userId);
  await prisma.shortlist.deleteMany({ where: { employerId: employer.id, profileId } });
}

export async function listShortlist(userId: string) {
  const employer = await myEmployerOrThrow(userId);
  const rows = await prisma.shortlist.findMany({
    where: { employerId: employer.id },
    include: { profile: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    rows.map(async (r) => {
      const sets = await skillSetsFor(r.profileId);
      const p = r.profile;
      return {
        profileId: r.profileId,
        name: `${p.user.firstName} ${p.user.lastName}`,
        initials: `${p.user.firstName[0]}${p.user.lastName[0]}`.toUpperCase(),
        email: p.user.email,
        headline: p.headline,
        location: p.location,
        qualification: p.qualification,
        verifiedSkills: sets.verified.map((s) => s.name),
        declaredSkills: sets.declared.map((s) => s.name),
        note: r.note,
        addedAt: r.createdAt.toISOString(),
      };
    }),
  );
}
