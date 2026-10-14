// Talks to the Express backend. In development Vite forwards /api/* to http://localhost:4000.
//
// Login uses two tokens (section 3.5 of the design document):
//  - a short-lived JWT access token, kept only in memory and sent as "Authorization: Bearer ..."
//  - a long-lived refresh token in an httpOnly cookie (JavaScript can't read it). When the access
//    token expires we call /api/auth/refresh, which rotates the cookie and returns a new access token.
import type {
  AccountUpdateInput,
  ApplyInput,
  ChangePasswordInput,
  MentorProfileInput,
  OpportunityInput,
  BookSessionInput,
  SubmitAssessmentInput,
  LoginInput,
  OnboardingInput,
  ProfileUpdateInput,
  ProjectEvidenceInput,
  RegisterInput,
} from "@shared/schemas";
import type {
  AdminOverview,
  AdminUser,
  Applicant,
  ApplicationStatusKey,
  CandidateDetail,
  CandidateSummary,
  EmployerOpportunity,
  EmployerOverview,
  MentorOverview,
  MentorProfile,
  Notification,
  OpportunityDetail,
  Role,
  ShortlistEntry,
  Application,
  AssessmentAttempt,
  AssessmentResult,
  AssessmentSummary,
  BookedSession,
  MentorDetail,
  MentorSummary,
  ModuleDetail,
  ModuleSummary,
  AuthResponse,
  Dashboard,
  Opportunity,
  Profile,
  ProfileSnapshot,
  Skill,
  User,
  UserSkill,
} from "./types";

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const session = {
  setAccessToken: (token: string | null) => {
    accessToken = token;
  },
  /** Called when the session can't be refreshed any more (the user must log in again). */
  onExpired: (handler: () => void) => {
    onSessionExpired = handler;
  },
};

/** An error from the API, e.g. status 401 with "Incorrect email or password." */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

const OFFLINE = "Can't reach the server. Is the backend running? (npm run dev)";

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { "X-Requested-With": "XMLHttpRequest" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  try {
    return await fetch(`/api${path}`, {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, OFFLINE);
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error ?? (res.status >= 500 ? OFFLINE : `Request failed (${res.status})`);
    throw new ApiError(res.status, message, data?.field);
  }
  return data as T;
}

// Only one refresh at a time: parallel requests that all got a 401 wait for the same refresh.
let refreshing: Promise<AuthResponse | null> | null = null;

/** Uses the refresh cookie to get a new access token. Returns null if the user isn't logged in. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    try {
      const res = await send("POST", "/auth/refresh");
      if (!res.ok) return null;
      const data = (await res.json()) as AuthResponse;
      accessToken = data.accessToken;
      return data;
    } catch {
      return null;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body);
  // Access token expired? Refresh once and retry.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await send(method, path, body);
    } else {
      accessToken = null;
      onSessionExpired?.();
    }
  }
  return parse<T>(res);
}

export const api = {
  // Auth
  login: (input: LoginInput) => request<AuthResponse>("POST", "/auth/login", input),
  register: (input: RegisterInput) => request<AuthResponse>("POST", "/auth/register", input),
  logout: () => request<void>("POST", "/auth/logout"),

  // Profile
  profile: () => request<Profile>("GET", "/profile"),
  updateProfile: (input: ProfileUpdateInput) => request<User>("PUT", "/profile", input),
  completeOnboarding: (input: OnboardingInput) => request<User>("POST", "/profile/onboarding", input),
  profileSnapshot: () => request<ProfileSnapshot>("GET", "/profile/snapshot"),

  // Skills
  skills: () => request<Skill[]>("GET", "/skills"),
  mySkills: () => request<UserSkill[]>("GET", "/skills/mine"),
  verifyWithProject: (skillId: string, input: ProjectEvidenceInput) =>
    request<UserSkill>("POST", `/skills/${skillId}/verify`, input),

  // Opportunities
  opportunities: () => request<Opportunity[]>("GET", "/opportunities"),
  opportunity: (id: string) => request<OpportunityDetail>("GET", `/opportunities/${id}`),
  toggleSaved: (id: string) => request<{ saved: boolean }>("POST", `/opportunities/${id}/save`),
  apply: (id: string, input: ApplyInput) => request<Application>("POST", `/opportunities/${id}/apply`, input),
  applications: () => request<Application[]>("GET", "/applications"),
  withdrawApplication: (id: string) => request<void>("DELETE", `/applications/${id}`),
  setVisibility: (visibleToEmployers: boolean) => request<User>("PUT", "/profile/visibility", { visibleToEmployers }),

  // Assessments
  assessments: () => request<AssessmentSummary[]>("GET", "/assessments"),
  startAssessment: (id: string) => request<AssessmentAttempt>("POST", `/assessments/${id}/start`),
  submitAssessment: (attemptId: string, input: SubmitAssessmentInput) =>
    request<AssessmentResult>("POST", `/assessments/attempts/${attemptId}/submit`, input),

  // Learning
  modules: () => request<ModuleSummary[]>("GET", "/learn"),
  module: (id: string) => request<ModuleDetail>("GET", `/learn/${id}`),
  enrol: (id: string) => request<ModuleDetail>("POST", `/learn/${id}/enrol`),
  setLessonDone: (id: string, index: number, done: boolean) =>
    request<ModuleDetail>(done ? "POST" : "DELETE", `/learn/${id}/lessons/${index}/complete`),

  // Mentors
  mentors: () => request<MentorSummary[]>("GET", "/mentors"),
  mentor: (id: string) => request<MentorDetail>("GET", `/mentors/${id}`),
  bookSession: (id: string, input: BookSessionInput) => request<BookedSession>("POST", `/mentors/${id}/book`, input),
  sessions: () => request<BookedSession[]>("GET", "/sessions"),
  cancelSession: (id: string) => request<void>("DELETE", `/sessions/${id}`),

  // Dashboard & notifications
  dashboard: () => request<Dashboard>("GET", "/dashboard"),
  unreadCount: () => request<{ count: number }>("GET", "/notifications/unread-count"),
  notifications: () => request<Notification[]>("GET", "/notifications"),
  markRead: (id: string) => request<void>("POST", `/notifications/${id}/read`),
  markAllRead: () => request<void>("POST", "/notifications/read-all"),

  // Settings (all roles)
  updateAccount: (input: AccountUpdateInput) => request<User>("PUT", "/me", input),
  changePassword: (input: ChangePasswordInput) => request<AuthResponse>("POST", "/auth/password", input),
  deleteAccount: (password: string) => request<void>("DELETE", "/me", { password }),
  exportMyData: () => request<unknown>("GET", "/me/export"),

  // Employer
  employer: {
    overview: () => request<EmployerOverview>("GET", "/employer/overview"),
    opportunities: () => request<EmployerOpportunity[]>("GET", "/employer/opportunities"),
    createOpportunity: (input: OpportunityInput) => request<{ id: string }>("POST", "/employer/opportunities", input),
    updateOpportunity: (id: string, input: OpportunityInput) => request<void>("PUT", `/employer/opportunities/${id}`, input),
    setOpen: (id: string, open: boolean) => request<void>("POST", `/employer/opportunities/${id}/${open ? "open" : "close"}`),
    deleteOpportunity: (id: string) => request<void>("DELETE", `/employer/opportunities/${id}`),
    applicants: (id: string) =>
      request<{ opportunity: { id: string; title: string; skills: string[]; isOpen: boolean }; applicants: Applicant[] }>(
        "GET",
        `/employer/opportunities/${id}/applicants`,
      ),
    setStatus: (applicationId: string, status: ApplicationStatusKey) =>
      request<void>("PUT", `/employer/applications/${applicationId}/status`, { status }),
    candidates: (filters: { skills: string[]; location?: string; graduationYear?: string; verifiedOnly?: boolean }) => {
      const q = new URLSearchParams();
      if (filters.skills.length) q.set("skills", filters.skills.join(","));
      if (filters.location) q.set("location", filters.location);
      if (filters.graduationYear) q.set("graduationYear", filters.graduationYear);
      if (filters.verifiedOnly) q.set("verifiedOnly", "true");
      return request<CandidateSummary[]>("GET", `/employer/candidates?${q}`);
    },
    candidate: (profileId: string) => request<CandidateDetail>("GET", `/employer/candidates/${profileId}`),
    shortlist: () => request<ShortlistEntry[]>("GET", "/employer/shortlist"),
    addToShortlist: (profileId: string, note?: string) => request<void>("POST", "/employer/shortlist", { profileId, note }),
    removeFromShortlist: (profileId: string) => request<void>("DELETE", `/employer/shortlist/${profileId}`),
  },

  // Mentor
  mentorArea: {
    overview: () => request<MentorOverview>("GET", "/mentor/overview"),
    accept: (id: string) => request<void>("POST", `/mentor/sessions/${id}/accept`),
    decline: (id: string, reason?: string) => request<void>("POST", `/mentor/sessions/${id}/decline`, { reason }),
    complete: (id: string, note?: string) => request<void>("POST", `/mentor/sessions/${id}/complete`, { note }),
    profile: () => request<MentorProfile>("GET", "/mentor/profile"),
    updateProfile: (input: MentorProfileInput) => request<MentorProfile>("PUT", "/mentor/profile", input),
  },

  // Admin
  admin: {
    overview: () => request<AdminOverview>("GET", "/admin/overview"),
    users: (role?: Role) => request<AdminUser[]>("GET", `/admin/users${role ? `?role=${role}` : ""}`),
  },
};

/** Where each role lands after logging in. */
export function homeForRole(role: User["role"]) {
  switch (role) {
    case "employer":
      return "/employer/dashboard";
    case "mentor":
      return "/mentor/dashboard";
    case "admin":
      return "/admin";
    default:
      return "/dashboard";
  }
}

/** "2026-08-12T09:00:00Z" -> "12 Aug 2026" */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}
