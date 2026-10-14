import { prisma } from "../db";
import { unreadCount } from "./feed.service";
import { upcomingSessions } from "./mentors.service";
import { listOpportunities } from "./opportunities.service";
import { getProfileOrThrow, readinessFor, skillsFor } from "./profile.service";

/** Everything the graduate dashboard shows, in one request. */
export async function getDashboard(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const [readiness, activity, skills, sessions, opportunities, unread] = await Promise.all([
    readinessFor(profile.id, profile.completeness),
    prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    skillsFor(profile.id),
    upcomingSessions(profile.id, 3),
    listOpportunities(userId),
    unreadCount(userId),
  ]);
  return {
    readiness,
    activity: activity.map((a) => ({
      id: a.id,
      label: a.label,
      detail: a.detail,
      kind: a.kind,
      time: a.createdAt.toISOString(),
    })),
    verifiedSkills: skills.verified.map((s) => s.name),
    sessions,
    recommendedOpportunities: opportunities.slice(0, 4),
    unreadNotifications: unread,
  };
}
