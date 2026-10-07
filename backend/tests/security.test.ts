import { describe, expect, it } from "vitest";
import { loginSchema, projectEvidenceSchema, registerSchema } from "@shared/schemas";
import { checkPassword, hashPassword } from "../src/services/auth.service";
import { signAccessToken, verifyAccessToken } from "../src/services/tokens";

describe("passwords", () => {
  it("are hashed with Argon2id and verified", async () => {
    const hashed = await hashPassword("password123");
    expect(hashed.startsWith("$argon2id$")).toBe(true);
    expect(await checkPassword(hashed, "password123")).toBe(true);
    expect(await checkPassword(hashed, "Password123")).toBe(false);
  });
});

describe("access tokens (JWT)", () => {
  it("round-trips the user id and role", () => {
    const token = signAccessToken("user-1", "graduate");
    expect(verifyAccessToken(token)).toEqual({ sub: "user-1", role: "graduate" });
  });
  it("rejects a tampered token", () => {
    const token = signAccessToken("user-1", "graduate");
    expect(verifyAccessToken(token.slice(0, -2) + "xx")).toBeNull();
  });
});

describe("shared validation (Zod)", () => {
  it("normalises emails", () => {
    const parsed = loginSchema.parse({ email: "  Thandi@Example.CO.ZA ", password: "x" });
    expect(parsed.email).toBe("thandi@example.co.za");
  });
  it("requires POPIA consent on sign-up", () => {
    const result = registerSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: "a@b.co",
      password: "longpass1",
      role: "graduate",
      acceptTerms: true,
    });
    expect(result.success).toBe(false);
  });
  it("does not allow signing up as admin", () => {
    const result = registerSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: "a@b.co",
      password: "longpass1",
      role: "admin",
      acceptTerms: true,
      popiaConsent: true,
    });
    expect(result.success).toBe(false);
  });
  it("needs a project name and consent for evidence", () => {
    expect(projectEvidenceSchema.safeParse({ projectName: "", consent: true }).success).toBe(false);
    expect(projectEvidenceSchema.safeParse({ projectName: "API" }).success).toBe(false);
    expect(projectEvidenceSchema.safeParse({ projectName: "API", consent: true }).success).toBe(true);
  });
});
