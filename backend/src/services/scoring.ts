/**
 * The platform's scoring rules, kept as small pure functions so they are easy to read and unit test.
 */
import crypto from "node:crypto";

export interface Readiness {
  total: number;
  profile: number;
  skills: number;
  learning: number;
}

/**
 * Career readiness score (0-100):
 *  - profile completeness  -> up to 40 points
 *  - verified skills       -> 9 points each, up to 35
 *  - learning progress     -> up to 25 points (average progress across all modules)
 */
export function calculateReadiness(profileCompleteness: number, verifiedSkills: number, learningProgress: number): Readiness {
  const profilePoints = Math.round((profileCompleteness / 100) * 40);
  const skillPoints = Math.min(35, verifiedSkills * 9);
  const learningPoints = Math.round((learningProgress / 100) * 25);
  return {
    total: Math.min(100, profilePoints + skillPoints + learningPoints),
    profile: profileCompleteness,
    skills: verifiedSkills,
    learning: Math.round(learningProgress),
  };
}

/**
 * Match % between a graduate and an opportunity.
 * Each required skill scores 1 if verified, 0.5 if only self-declared, 0 if missing.
 * match = 40 + 60 * points / number of required skills
 */
export function calculateMatch(requiredSkills: string[], verified: Set<string>, declared: Set<string>): number {
  if (requiredSkills.length === 0) return 40;
  let points = 0;
  for (const skill of requiredSkills) {
    const key = skill.toLowerCase();
    if (verified.has(key)) points += 1;
    else if (declared.has(key)) points += 0.5;
  }
  return Math.round(40 + (60 * points) / requiredSkills.length);
}

/** Profile completeness: 40% to start, +12% for each of the 5 onboarding sections filled in. */
export function calculateCompleteness(sectionsDone: boolean[]): number {
  return Math.min(100, 40 + sectionsDone.filter(Boolean).length * 12);
}

/** SHA-256 fingerprint of a SkillsRecord, so any later edit to the record can be detected. */
export function evidenceHash(record: {
  profileId: string;
  skillId: string;
  evidenceType: string;
  score?: number | null;
  artefactId?: string | null;
  verifiedAt: Date;
}): string {
  const canonical = JSON.stringify([
    record.profileId,
    record.skillId,
    record.evidenceType,
    record.score ?? null,
    record.artefactId ?? null,
    record.verifiedAt.toISOString(),
  ]);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}
