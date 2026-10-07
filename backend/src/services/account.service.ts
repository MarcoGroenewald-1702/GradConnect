import { prisma } from "../db";
import { unauthorized } from "../lib/errors";
import { checkPassword } from "./auth.service";

/** POPIA right of access: everything we store about the user, as JSON. */
export async function exportMyData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          declaredSkills: { include: { skill: true } },
          skillsRecords: { include: { skill: true, artefact: true } },
          artefacts: true,
          enrolments: true,
          mentorSessions: true,
          savedOpportunities: true,
          applications: true,
          assessmentAttempts: true,
        },
      },
      employer: true,
      mentor: true,
      activities: true,
      notifications: true,
    },
  });
  if (!user) throw unauthorized();
  const { passwordHash: _hidden, ...safe } = user;
  return { exportedAt: new Date().toISOString(), account: safe };
}

/** POPIA right to deletion: removes the account and everything linked to it (cascading deletes). */
export async function deleteMyAccount(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await checkPassword(user.passwordHash, password))) {
    throw unauthorized("Incorrect password.");
  }
  await prisma.user.delete({ where: { id: userId } });
}
