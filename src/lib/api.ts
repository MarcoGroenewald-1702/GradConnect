// Talks to the Express backend. In development Vite forwards /api/* to http://localhost:4000.
//
// Login uses two tokens (section 3.5 of the design document):
//  - a short-lived JWT access token, kept only in memory and sent as "Authorization: Bearer ..."
//  - a long-lived refresh token in an httpOnly cookie (JavaScript can't read it). When the access
//    token expires we call /api/auth/refresh, which rotates the cookie and returns a new access token.
import type {
  ApplyInput,
  BookSessionInput,
  SubmitAssessmentInput,
  LoginInput,
  OnboardingInput,
  ProfileUpdateInput,
  ProjectEvidenceInput,
  RegisterInput,
} from "@shared/schemas";
import type {
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
  opportunity: (id: string) => request<Opportunity>("GET", `/opportunities/${id}`),
  toggleSaved: (id: string) => request<{ saved: boolean }>("POST", `/opportunities/${id}/save`),
  apply: (id: string, input: ApplyInput) => request<Application>("POST", `/opportunities/${id}/apply`, input),
  applications: () => request<Application[]>("GET", "/applications"),

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
