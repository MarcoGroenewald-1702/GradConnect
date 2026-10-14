// Shapes of the JSON returned by the Express API (see backend/src/services).

export type Role = "graduate" | "employer" | "mentor" | "admin";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  avatarInitials: string;
  headline: string | null;
  institution: string | null;
  qualification: string | null;
  graduationYear: string | null;
  location: string | null;
  careerInterest: string | null;
  targetRole: string | null;
  bio: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  company: string | null;
  jobTitle: string | null;
  onboarded: boolean;
  profileCompleteness: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface UserSkill {
  skillId: string;
  name: string;
  category: string;
  verified: boolean;
  method: "assessment" | "project" | null;
  score: number | null;
  verifiedOn: string | null;
}

export interface Readiness {
  total: number;
  profile: number;
  skills: number;
  learning: number;
}

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  type: string;
  match: number;
  skills: string[];
  postedDate: string;
  experience: string;
  salary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  saved: boolean;
  applied: boolean;
}

export interface Application {
  id: string;
  opportunityId: string;
  title: string;
  company: string;
  appliedOn: string;
  match: number;
  status: string;
  coverNote: string | null;
}

export interface Activity {
  id: string;
  label: string;
  detail: string;
  kind: "verified" | "applied" | "learning" | "mentor";
  time: string;
}

export interface MentorSession {
  id: string;
  mentorId: string;
  mentorName: string;
  topic: string;
  goal: string | null;
  day: string;
  time: string;
}

export interface Project {
  name: string;
  description: string | null;
  repo: string | null;
  skill: string | null;
}

export interface Dashboard {
  readiness: Readiness;
  activity: Activity[];
  verifiedSkills: string[];
  sessions: MentorSession[];
  recommendedOpportunities: Opportunity[];
  unreadNotifications: number;
}

export interface Profile {
  user: User;
  verifiedSkills: UserSkill[];
  declaredSkills: UserSkill[];
  projects: Project[];
  readiness: Readiness;
}

/** What an employer receives when you apply (a frozen copy of your profile). */
export interface ProfileSnapshot {
  name: string;
  email: string;
  headline: string | null;
  location: string | null;
  institution: string | null;
  qualification: string | null;
  graduationYear: string | null;
  careerInterest: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  verifiedSkills: { name: string; method: string | null; verifiedOn: string | null }[];
  declaredSkills: string[];
  readinessScore: number;
  takenAt: string;
}

// ---------- Assessments ----------

export interface AssessmentSummary {
  id: string;
  title: string;
  skillId: string;
  skill: string;
  category: string;
  minutes: number;
  questionCount: number;
  passMark: number;
  verified: boolean;
  verifiedBy: "assessment" | "project" | null;
  attempts: number;
  bestScore: number | null;
  lastAttemptAt: string | null;
}

export interface AssessmentAttempt {
  attemptId: string;
  assessment: { id: string; title: string; skill: string; minutes: number; passMark: number };
  questions: { prompt: string; options: string[] }[];
  startedAt: string;
  endsAt: string;
}

export interface AssessmentResult {
  score: number;
  correct: number;
  total: number;
  passMark: number;
  passed: boolean;
  late: boolean;
  skill: string;
  review: { prompt: string; options: string[]; chosen: number; isCorrect: boolean; answer: number | null }[];
}

// ---------- Learning ----------

export interface ModuleSummary {
  id: string;
  title: string;
  skill: string;
  track: string;
  difficulty: string;
  minutes: number;
  description: string;
  lessonCount: number;
  completedCount: number;
  progress: number;
  enrolled: boolean;
  completed: boolean;
  recommended: boolean;
}

export interface ModuleDetail {
  id: string;
  title: string;
  skill: string;
  track: string;
  difficulty: string;
  minutes: number;
  description: string;
  objectives: string[];
  lessons: { index: number; title: string; minutes: number; content: string[]; done: boolean }[];
  enrolled: boolean;
  progress: number;
  completedAt: string | null;
}

// ---------- Mentors ----------

export interface MentorSummary {
  id: string;
  name: string;
  initials: string;
  jobTitle: string;
  company: string;
  years: number;
  rating: number;
  sessions: number;
  availability: string;
  bio: string;
  specialisations: string[];
  languages: string[];
}

export interface MentorDetail extends MentorSummary {
  slots: { day: string; times: { time: string; available: boolean; mine: boolean }[] }[];
}

export interface BookedSession {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorInitials: string;
  mentorTitle: string;
  topic: string;
  goal: string | null;
  question: string | null;
  day: string;
  time: string;
  bookedAt: string;
}
