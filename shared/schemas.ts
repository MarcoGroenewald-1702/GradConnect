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
  /** POPIA opt-in: let employers find this profile */
  visibleToEmployers: z.boolean().default(false),
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

// ---------- Assessments ----------

/** The answer index chosen for each question, in order (-1 = skipped). */
export const submitAssessmentSchema = z.object({
  answers: z.array(z.number().int().min(-1).max(20)).max(100),
});
export type SubmitAssessmentInput = z.input<typeof submitAssessmentSchema>;

// ---------- Mentors ----------

export const bookSessionSchema = z.object({
  day: z.string().trim().min(1).max(10),
  time: z.string().trim().regex(/^\d{2}:\d{2}$/, "Please choose a time slot."),
  topic: z.string().trim().min(1, "Please choose a topic.").max(80),
  goal: z.string().trim().min(3, "Please describe your goal for the session.").max(200, "Keep the goal under 200 characters."),
  question: optionalText(1000),
});
export type BookSessionInput = z.input<typeof bookSessionSchema>;

// ---------- Settings (all roles) ----------

export const accountUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "Please enter your first name.").max(60),
  lastName: z.string().trim().min(1, "Please enter your last name.").max(60),
});
export type AccountUpdateInput = z.input<typeof accountUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password."),
    newPassword: password,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const visibilitySchema = z.object({ visibleToEmployers: z.boolean() });

// ---------- Employer ----------

/** One item per line in the form -> array of trimmed, non-empty strings */
const lines = (maxItems: number) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split("\n")).map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(300)).max(maxItems, `No more than ${maxItems} items.`));

export const opportunityTypes = ["Job", "Internship", "Learnership", "Freelance Project"] as const;
export const workModes = ["On-site", "Hybrid", "Remote"] as const;

export const opportunitySchema = z.object({
  title: z.string().trim().min(3, "Please enter a job title.").max(120),
  type: z.enum(opportunityTypes, { error: "Please choose a type." }),
  location: z.string().trim().min(2, "Please enter a location.").max(120),
  workMode: z.enum(workModes, { error: "Please choose a work mode." }),
  experience: z.string().trim().min(2, "Please describe the experience needed.").max(60),
  salary: z.string().trim().min(2, "Please give a salary or stipend.").max(80),
  description: z.string().trim().min(20, "Please write at least 20 characters.").max(3000),
  skills: z.array(z.string().trim().min(1).max(40)).min(1, "Choose at least one skill.").max(10, "No more than 10 skills."),
  responsibilities: lines(12),
  requirements: lines(12),
});
export type OpportunityInput = z.input<typeof opportunitySchema>;

export const applicationStatuses = ["submitted", "under_review", "interview", "offer", "rejected"] as const;
export const applicationStatusSchema = z.object({ status: z.enum(applicationStatuses) });

export const shortlistSchema = z.object({
  profileId: z.string().min(1),
  note: optionalText(300),
});
export type ShortlistInput = z.input<typeof shortlistSchema>;

// ---------- Mentor ----------

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const mentorProfileSchema = z.object({
  jobTitle: z.string().trim().min(2, "Please enter your job title.").max(80),
  company: z.string().trim().min(1, "Please enter your company.").max(80),
  years: z.coerce.number().int().min(0).max(60),
  bio: z.string().trim().max(1000),
  availability: z.string().trim().max(80),
  specialisations: lines(10),
  languages: lines(6),
  slots: z
    .array(
      z.object({
        day: z.enum(weekDays),
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/, "Times look like 17:30.")).max(12),
      }),
    )
    .max(7),
});
export type MentorProfileInput = z.input<typeof mentorProfileSchema>;

export const completeSessionSchema = z.object({ note: optionalText(1000) });
export const declineSessionSchema = z.object({ reason: optionalText(300) });
