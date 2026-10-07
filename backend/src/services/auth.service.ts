import crypto from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "@shared/schemas";
import { prisma } from "../db";
import { conflict, unauthorized } from "../lib/errors";
import { issueRefreshToken, signAccessToken } from "./tokens";

type RegisterData = z.output<typeof registerSchema>;
type LoginData = z.output<typeof loginSchema>;

/** Passwords are hashed with Argon2id (the default algorithm of @node-rs/argon2). */
export const hashPassword = (password: string) => hash(password);
export const checkPassword = (stored: string, password: string) => verify(stored, password).catch(() => false);

// Used when the email doesn't exist, so a failed login takes the same time either way.
let dummyHash: Promise<string> | null = null;

const userInclude = { profile: true, employer: true, mentor: true } as const;

/** The user as the frontend sees it (never includes the password hash). */
export async function getUserDto(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) throw unauthorized("Your account no longer exists.");
  const p = user.profile;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatarInitials: `${user.firstName[0] ?? "G"}${user.lastName[0] ?? "C"}`.toUpperCase(),
    headline: p?.headline ?? null,
    bio: p?.bio ?? null,
    location: p?.location ?? null,
    institution: p?.institution ?? null,
    qualification: p?.qualification ?? null,
    graduationYear: p?.graduationYear ?? null,
    careerInterest: p?.careerInterest ?? null,
    targetRole: p?.targetRole ?? null,
    githubUrl: p?.githubUrl ?? null,
    websiteUrl: p?.websiteUrl ?? null,
    company: user.employer?.name ?? user.mentor?.company ?? null,
    jobTitle: user.mentor?.jobTitle ?? null,
    onboarded: user.role === "graduate" ? (p?.onboarded ?? false) : true,
    profileCompleteness: p?.completeness ?? 0,
  };
}
export type UserDto = Awaited<ReturnType<typeof getUserDto>>;

/** Creates the account plus the role's own record (graduate profile, employer or mentor). */
export async function register(data: RegisterData) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict("An account with this email already exists.");

  const d = data.details;
  if (data.role === "employer" && d.company) {
    const company = await prisma.employer.findUnique({ where: { name: d.company } });
    if (company?.userId) throw conflict("That company already has an account.");
  }

  const passwordHash = await hashPassword(data.password);
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        termsAcceptedAt: now,
        popiaConsentAt: now,
      },
    });

    if (data.role === "graduate") {
      await tx.profile.create({
        data: {
          userId: created.id,
          institution: d.institution,
          qualification: d.qualification,
          graduationYear: d.graduationYear,
          careerInterest: d.careerInterest,
          location: d.location,
        },
      });
    } else if (data.role === "employer") {
      const name = d.company ?? `${data.firstName} ${data.lastName}`;
      await tx.employer.upsert({
        where: { name },
        update: { userId: created.id, industry: d.industry },
        create: { name, industry: d.industry, userId: created.id },
      });
    } else if (data.role === "mentor") {
      await tx.mentor.create({
        data: {
          id: `m-${crypto.randomUUID()}`,
          userId: created.id,
          name: `${data.firstName} ${data.lastName}`,
          initials: `${data.firstName[0]}${data.lastName[0]}`.toUpperCase(),
          jobTitle: d.jobTitle ?? "Mentor",
          company: d.company ?? "",
          years: Number.parseInt(d.years ?? "0", 10) || 0,
          rating: 0,
          availability: "Not set yet",
          bio: "",
          specialisations: (d.specialisations ?? "").split(/[,·]/).map((s) => s.trim()).filter(Boolean),
          languages: [],
          slots: [],
        },
      });
    }
    return created;
  });

  return startSession(user.id, user.role);
}

export async function login(data: LoginData) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    dummyHash ??= hashPassword("not-a-real-password");
    await checkPassword(await dummyHash, data.password);
    throw unauthorized("Incorrect email or password.");
  }
  if (!(await checkPassword(user.passwordHash, data.password))) {
    throw unauthorized("Incorrect email or password.");
  }
  return startSession(user.id, user.role);
}

/** New access token + new refresh-token family. */
async function startSession(userId: string, role: Parameters<typeof signAccessToken>[1]) {
  const refresh = await issueRefreshToken(userId);
  return {
    accessToken: signAccessToken(userId, role),
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
    user: await getUserDto(userId),
  };
}
