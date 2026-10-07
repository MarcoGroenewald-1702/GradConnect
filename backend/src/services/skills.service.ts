import type { z } from "zod";
import type { projectEvidenceSchema } from "@shared/schemas";
import { prisma } from "../db";
import { conflict, notFound } from "../lib/errors";
import { addActivity, addNotification } from "./feed.service";
import { getProfileOrThrow, skillsFor } from "./profile.service";
import { evidenceHash } from "./scoring";

export function listSkills() {
  return prisma.skill.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
}

export async function mySkills(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const skills = await skillsFor(profile.id);
  return [...skills.verified, ...skills.declared];
}

/**
 * Verifies a skill with project evidence: stores the project (ProjectArtefact) and a
 * tamper-evident SkillsRecord, then updates the activity feed and notifications.
 */
export async function verifyWithProject(userId: string, skillId: string, data: z.output<typeof projectEvidenceSchema>) {
  const profile = await getProfileOrThrow(userId);
  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) throw notFound(`Unknown skill: ${skillId}`);

  const already = await prisma.skillsRecord.findUnique({
    where: { profileId_skillId: { profileId: profile.id, skillId } },
  });
  if (already) throw conflict(`${skill.name} is already verified.`);

  await prisma.$transaction(async (tx) => {
    const artefact = await tx.projectArtefact.create({
      data: {
        profileId: profile.id,
        name: data.projectName,
        description: data.description,
        repoUrl: data.repoUrl,
        fileName: data.artefactName,
      },
    });
    const verifiedAt = new Date();
    await tx.skillsRecord.create({
      data: {
        profileId: profile.id,
        skillId,
        evidenceType: "project",
        artefactId: artefact.id,
        verifiedAt,
        evidenceHash: evidenceHash({
          profileId: profile.id,
          skillId,
          evidenceType: "project",
          artefactId: artefact.id,
          verifiedAt,
        }),
      },
    });
    // make sure the skill is also on the profile's declared list
    await tx.profileSkill.upsert({
      where: { profileId_skillId: { profileId: profile.id, skillId } },
      update: {},
      create: { profileId: profile.id, skillId },
    });
    await addActivity(tx, userId, `${skill.name} skill verified`, "Project evidence accepted", "verified");
    await addNotification(
      tx,
      userId,
      `Your ${skill.name} skill has been verified`,
      "The verified badge now appears on your public profile.",
      "skill",
    );
  });

  const skills = await mySkills(userId);
  return skills.find((s) => s.skillId === skillId)!;
}
