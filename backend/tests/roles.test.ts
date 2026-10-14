import { describe, expect, it } from "vitest";
import { changePasswordSchema, mentorProfileSchema, opportunitySchema } from "@shared/schemas";
import { nextDateFor, todaySast } from "../src/lib/dates";

describe("mentor session dates (South African time)", () => {
  // Wednesday 14 Oct 2026, 15:00 in South Africa = 13:00 UTC
  const wedAfternoon = new Date("2026-10-14T13:00:00Z");
  it("finds the next date for a weekly slot", () => {
    expect(nextDateFor("Thu", "17:00", wedAfternoon)).toBe("2026-10-15");
    expect(nextDateFor("Mon", "09:00", wedAfternoon)).toBe("2026-10-19");
  });
  it("uses today if the slot is later today, otherwise next week", () => {
    expect(nextDateFor("Wed", "17:30", wedAfternoon)).toBe("2026-10-14");
    expect(nextDateFor("Wed", "09:00", wedAfternoon)).toBe("2026-10-21");
  });
  it("uses the South African date near midnight", () => {
    expect(todaySast(new Date("2026-10-14T23:30:00Z"))).toBe("2026-10-15");
  });
});

describe("employer and mentor forms", () => {
  const job = {
    title: "Junior Data Engineer",
    type: "Job",
    location: "Johannesburg",
    workMode: "Hybrid",
    experience: "Graduate",
    salary: "R25 000 / month",
    description: "Build data pipelines with our analytics team.",
    skills: ["SQL"],
    responsibilities: "Build ETL jobs\n\n  Write SQL  ",
    requirements: ["SQL basics"],
  };
  it("turns one-per-line text into a clean list", () => {
    expect(opportunitySchema.parse(job).responsibilities).toEqual(["Build ETL jobs", "Write SQL"]);
  });
  it("needs at least one skill", () => {
    expect(opportunitySchema.safeParse({ ...job, skills: [] }).success).toBe(false);
  });
  it("checks mentor time slots look like 17:30", () => {
    const base = { jobTitle: "Dev", company: "X", years: 3, bio: "", availability: "", specialisations: "", languages: "" };
    expect(mentorProfileSchema.safeParse({ ...base, slots: [{ day: "Mon", times: ["17:30"] }] }).success).toBe(true);
    expect(mentorProfileSchema.safeParse({ ...base, slots: [{ day: "Mon", times: ["5pm"] }] }).success).toBe(false);
  });
  it("checks the new password is confirmed", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "a", newPassword: "newpassword1", confirm: "different1" }).success).toBe(false);
  });
});
