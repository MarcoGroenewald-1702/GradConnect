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
  visibleToEmployers: boolean;
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

export type MentorSession = BookedSession;

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
  /** true if the mentor confirms each request (has an account); demo mentors accept automatically */
  confirmsBookings: boolean;
  slots: { day: string; times: { time: string; date: string; available: boolean; mine: boolean }[] }[];
}

export type SessionStatus = "requested" | "accepted" | "completed";

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
  /** "2026-10-16" */
  date: string;
  status: SessionStatus;
  bookedAt: string;
}

// ---------- Opportunity detail, notifications ----------

export interface OpportunityDetail extends Opportunity {
  isOpen: boolean;
  applicationStatus: string | null;
  skillMatch: { skill: string; status: "verified" | "declared" | "missing" }[];
  employer: { name: string; industry: string | null; openRoles: number };
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  time: string;
}

// ---------- Employer ----------

export type ApplicationStatusKey = "submitted" | "under_review" | "interview" | "offer" | "rejected";

export interface EmployerOverview {
  employer: { name: string; industry: string | null };
  stats: { openOpportunities: number; applications: number; newApplications: number; interviews: number; shortlisted: number };
  recentApplications: {
    id: string;
    opportunityId: string;
    opportunityTitle: string;
    candidate: string;
    initials: string;
    status: string;
    appliedAt: string;
  }[];
  opportunities: { id: string; title: string; isOpen: boolean; applications: number }[];
}

export interface EmployerOpportunity {
  id: string;
  title: string;
  type: string;
  location: string;
  workMode: string;
  experience: string;
  salary: string;
  description: string;
  skills: string[];
  responsibilities: string[];
  requirements: string[];
  isOpen: boolean;
  postedAt: string;
  applications: number;
  newApplications: number;
}

export interface Applicant {
  id: string;
  profileId: string;
  candidate: string;
  initials: string;
  status: ApplicationStatusKey;
  statusLabel: string;
  coverNote: string | null;
  appliedAt: string;
  match: number;
  snapshot: {
    name?: string;
    email?: string;
    headline?: string | null;
    location?: string | null;
    institution?: string | null;
    qualification?: string | null;
    graduationYear?: string | null;
    verifiedSkills?: (string | { name: string })[];
    declaredSkills?: string[];
    readinessScore?: number;
  };
}

export interface CandidateSummary {
  profileId: string;
  name: string;
  initials: string;
  headline: string | null;
  location: string | null;
  institution: string | null;
  qualification: string | null;
  graduationYear: string | null;
  careerInterest: string | null;
  verifiedSkills: string[];
  declaredSkills: string[];
  readiness: number;
  match: number | null;
  shortlisted: boolean;
}

export interface CandidateDetail {
  profileId: string;
  name: string;
  initials: string;
  email: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  institution: string | null;
  qualification: string | null;
  graduationYear: string | null;
  careerInterest: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  readiness: Readiness;
  verifiedSkills: { name: string; method: string | null; score: number | null; verifiedOn: string | null }[];
  declaredSkills: string[];
  projects: Project[];
  shortlisted: boolean;
  note: string | null;
}

export interface ShortlistEntry {
  profileId: string;
  name: string;
  initials: string;
  email: string;
  headline: string | null;
  location: string | null;
  qualification: string | null;
  verifiedSkills: string[];
  declaredSkills: string[];
  note: string | null;
  addedAt: string;
}

// ---------- Mentor ----------

export interface MenteeSession extends BookedSession {
  mentorNote: string | null;
  mentee: {
    name: string;
    initials: string;
    email: string;
    headline: string | null;
    qualification: string | null;
    institution: string | null;
  };
}

export interface MentorOverview {
  mentor: MentorSummary & { slots: { day: string; times: string[] }[] };
  stats: { requests: number; upcoming: number; completed: number; mentees: number; rating: number };
  requests: MenteeSession[];
  upcoming: MenteeSession[];
  completed: MenteeSession[];
}

export type MentorProfile = MentorSummary & { slots: { day: string; times: string[] }[] };

// ---------- Admin ----------

export interface AdminOverview {
  users: { total: number; byRole: Partial<Record<Role, number>>; onboarded: number; visibleToEmployers: number };
  verifiedSkills: { total: number; byAssessment: number; byProject: number };
  assessments: {
    id: string;
    title: string;
    skill: string;
    attempts: number;
    passed: number;
    passRate: number | null;
    averageScore: number | null;
  }[];
  applications: Partial<Record<ApplicationStatusKey, number>>;
  sessions: Partial<Record<SessionStatus, number>>;
  opportunities: { open: number; closed: number };
  learning: { enrolments: number; completed: number; averageProgress: number };
  recentUsers: { id: string; name: string; email: string; role: Role; createdAt: string }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  detail: string;
}
