import { describe, expect, it } from "vitest";
import { calculateCompleteness, calculateMatch, calculateReadiness, evidenceHash } from "../src/services/scoring";

describe("career readiness", () => {
  it("combines profile, verified skills and learning", () => {
    // 80% profile -> 32 pts, 3 verified skills -> 27 pts, 38.8% learning -> 10 pts
    expect(calculateReadiness(80, 3, 38.8)).toEqual({ total: 69, profile: 80, skills: 3, learning: 39 });
  });
  it("caps verified-skill points at 35 and the total at 100", () => {
    expect(calculateReadiness(100, 10, 100).total).toBe(100);
    expect(calculateReadiness(0, 10, 0).total).toBe(35);
  });
});

describe("opportunity match", () => {
  const verified = new Set(["c#", "sql"]);
  const declared = new Set(["react"]);
  it("counts verified skills fully and declared skills as half", () => {
    expect(calculateMatch(["C#", ".NET Core", "SQL"], verified, declared)).toBe(80);
    expect(calculateMatch(["React", "TypeScript", "Git"], verified, declared)).toBe(50);
  });
  it("gives the base score when nothing matches", () => {
    expect(calculateMatch(["Azure"], verified, declared)).toBe(40);
    expect(calculateMatch([], verified, declared)).toBe(40);
  });
});

describe("profile completeness", () => {
  it("starts at 40% and adds 12% per completed section", () => {
    expect(calculateCompleteness([false, false, false, false, false])).toBe(40);
    expect(calculateCompleteness([true, true, true, true, false])).toBe(88);
    expect(calculateCompleteness([true, true, true, true, true])).toBe(100);
  });
});

describe("evidence hash", () => {
  const record = {
    profileId: "p1",
    skillId: "sql",
    evidenceType: "assessment",
    score: 78,
    verifiedAt: new Date("2026-08-02T09:00:00Z"),
  };
  it("is stable for the same record", () => {
    expect(evidenceHash(record)).toBe(evidenceHash({ ...record }));
  });
  it("changes if the record is tampered with", () => {
    expect(evidenceHash({ ...record, score: 99 })).not.toBe(evidenceHash(record));
  });
});
