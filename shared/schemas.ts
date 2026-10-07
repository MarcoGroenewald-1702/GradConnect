/**
 * Request validation schemas, shared by the frontend (forms) and the backend (API).
 * One source of truth: if a rule changes here, both sides follow it.
 */
import { z } from "zod";

/** Optional free text: trims it, and turns "" into undefined. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value ? value : undefined));

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address."));

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const roleSchema = z.enum(["graduate", "employer", "mentor"]);

// ---------- Auth ----------

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password."),
});
export type LoginInput = z.input<typeof loginSchema>;

/** Step 1 of the sign-up form (checked in the browser before moving on). */
export const signupAccountSchema = z
  .object({
    firstName: z.string().trim().min(1, "Please enter your first name.").max(60),
    lastName: z.string().trim().min(1, "Please enter your last name.").max(60),
    email,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });
export type SignupAccountInput = z.input<typeof signupAccountSchema>;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name.").max(60),
  lastName: z.string().trim().min(1, "Please enter your last name.").max(60),
  email,
  password,
  role: roleSchema,
  details: z
    .object({
      institution: optionalText(120),
      qualification: optionalText(120),
      graduationYear: optionalText(4),
      careerInterest: optionalText(120),
      location: optionalText(120),
      company: optionalText(120),
      industry: optionalText(120),
      jobTitle: optionalText(120),
      years: optionalText(3),
      specialisations: optionalText(200),
    })
    .prefault({}),
  acceptTerms: z.literal(true, { error: "Please accept the terms and conditions." }),
  popiaConsent: z.literal(true, { error: "Please give POPIA consent to continue." }),
});
export type RegisterInput = z.input<typeof registerSchema>;

// ---------- Profile ----------

export const onboardingSchema = z.object({
  headline: optionalText(120),
  location: optionalText(120),
  bio: optionalText(1000),
  institution: optionalText(120),
  qualification: optionalText(120),
  graduationYear: optionalText(4),
  skillIds: z.array(z.string().max(40)).max(40).default([]),
  careerInterest: optionalText(120),
  targetRole: optionalText(120),
  githubUrl: optionalText(200),
  websiteUrl: optionalText(200),
});
export type OnboardingInput = z.input<typeof onboardingSchema>;

export const profileUpdateSchema = z.object({
  headline: optionalText(120),
  location: optionalText(120),
  careerInterest: optionalText(120),
  bio: optionalText(1000),
});
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;

// ---------- Skills ----------

export const projectEvidenceSchema = z.object({
  projectName: z.string().trim().min(1, "Please give your project a name.").max(120),
  repoUrl: optionalText(200),
  description: optionalText(2000),
  artefactName: optionalText(200),
  consent: z.literal(true, { error: "Please confirm before verifying." }),
});
export type ProjectEvidenceInput = z.input<typeof projectEvidenceSchema>;

// ---------- Opportunities ----------

export const applySchema = z.object({
  coverNote: optionalText(500),
});
export type ApplyInput = z.input<typeof applySchema>;

// ---------- Account (POPIA) ----------

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Please enter your password to confirm."),
});
