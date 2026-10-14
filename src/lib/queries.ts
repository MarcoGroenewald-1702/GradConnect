// Server state with TanStack Query: data is fetched, cached and refreshed automatically.
// After a change (mutation) we "invalidate" the affected queries so they reload.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApplyInput,
  BookSessionInput,
  OnboardingInput,
  ProfileUpdateInput,
  ProjectEvidenceInput,
  SubmitAssessmentInput,
} from "@shared/schemas";
import { api } from "./api";

export const keys = {
  dashboard: ["dashboard"] as const,
  profile: ["profile"] as const,
  snapshot: ["profile", "snapshot"] as const,
  skills: ["skills"] as const,
  mySkills: ["skills", "mine"] as const,
  unread: ["notifications", "unread"] as const,
  assessments: ["assessments"] as const,
  modules: ["learn"] as const,
  module: (id: string) => ["learn", id] as const,
  mentors: ["mentors"] as const,
  mentor: (id: string) => ["mentors", id] as const,
  sessions: ["sessions"] as const,
};

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard });
export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: api.profile });
export const useSkills = () => useQuery({ queryKey: keys.skills, queryFn: api.skills, staleTime: Infinity });
export const useMySkills = () => useQuery({ queryKey: keys.mySkills, queryFn: api.mySkills });
export const useProfileSnapshot = (enabled: boolean) =>
  useQuery({ queryKey: keys.snapshot, queryFn: api.profileSnapshot, enabled });
export const useUnreadCount = (enabled: boolean) =>
  useQuery({ queryKey: keys.unread, queryFn: api.unreadCount, enabled, refetchInterval: 60_000 });

export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleSaved(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dashboard });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApplyInput }) => api.apply(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dashboard });
      qc.invalidateQueries({ queryKey: keys.unread });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

export function useVerifySkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, input }: { skillId: string; input: ProjectEvidenceInput }) =>
      api.verifyWithProject(skillId, input),
    onSuccess: () => qc.invalidateQueries(), // readiness, profile, dashboard and skills all change
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => api.updateProfile(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardingInput) => api.completeOnboarding(input),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------- Assessments ----------

export const useAssessments = () => useQuery({ queryKey: keys.assessments, queryFn: api.assessments });

export function useStartAssessment() {
  return useMutation({ mutationFn: (id: string) => api.startAssessment(id) });
}

export function useSubmitAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attemptId, input }: { attemptId: string; input: SubmitAssessmentInput }) =>
      api.submitAssessment(attemptId, input),
    onSuccess: () => qc.invalidateQueries(), // a pass changes skills, readiness, dashboard ...
  });
}

// ---------- Learning ----------

export const useModules = () => useQuery({ queryKey: keys.modules, queryFn: api.modules });
export const useModule = (id: string) => useQuery({ queryKey: keys.module(id), queryFn: () => api.module(id) });

export function useLessonDone(moduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ index, done }: { index: number; done: boolean }) => api.setLessonDone(moduleId, index, done),
    onSuccess: (detail) => {
      qc.setQueryData(keys.module(moduleId), detail);
      qc.invalidateQueries({ queryKey: keys.modules });
      qc.invalidateQueries({ queryKey: keys.dashboard });
      qc.invalidateQueries({ queryKey: keys.unread });
    },
  });
}

export function useEnrol(moduleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.enrol(moduleId),
    onSuccess: (detail) => {
      qc.setQueryData(keys.module(moduleId), detail);
      qc.invalidateQueries({ queryKey: keys.modules });
    },
  });
}

// ---------- Mentors ----------

export const useMentors = () => useQuery({ queryKey: keys.mentors, queryFn: api.mentors });
export const useMentor = (id: string) => useQuery({ queryKey: keys.mentor(id), queryFn: () => api.mentor(id) });
export const useSessions = () => useQuery({ queryKey: keys.sessions, queryFn: api.sessions });

export function useBookSession(mentorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BookSessionInput) => api.bookSession(mentorId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mentors });
      qc.invalidateQueries({ queryKey: keys.sessions });
      qc.invalidateQueries({ queryKey: keys.dashboard });
      qc.invalidateQueries({ queryKey: keys.unread });
    },
  });
}

export function useCancelSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cancelSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.mentors });
      qc.invalidateQueries({ queryKey: keys.sessions });
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

// ---------- Opportunities, applications, notifications (graduate) ----------

export const useOpportunities = () => useQuery({ queryKey: ["opportunities"], queryFn: api.opportunities });
export const useOpportunity = (id: string) => useQuery({ queryKey: ["opportunities", id], queryFn: () => api.opportunity(id) });
export const useApplications = () => useQuery({ queryKey: ["applications"], queryFn: api.applications });
export const useNotifications = () => useQuery({ queryKey: ["notifications"], queryFn: api.notifications });

/** For mutations that change many things at once: reload everything that's on screen. */
function useRefreshAll<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}

export const useWithdrawApplication = () => useRefreshAll((id: string) => api.withdrawApplication(id));
export const useMarkRead = () => useRefreshAll((id: string) => api.markRead(id));
export const useMarkAllRead = () => useRefreshAll(() => api.markAllRead());
export const useSetVisibility = () => useRefreshAll((visible: boolean) => api.setVisibility(visible));

// ---------- Employer ----------

export const useEmployerOverview = () => useQuery({ queryKey: ["employer", "overview"], queryFn: api.employer.overview });
export const useEmployerOpportunities = () =>
  useQuery({ queryKey: ["employer", "opportunities"], queryFn: api.employer.opportunities });
export const useApplicants = (id: string) =>
  useQuery({ queryKey: ["employer", "applicants", id], queryFn: () => api.employer.applicants(id) });
export const useCandidates = (filters: Parameters<typeof api.employer.candidates>[0]) =>
  useQuery({ queryKey: ["employer", "candidates", filters], queryFn: () => api.employer.candidates(filters) });
export const useCandidate = (profileId: string | null) =>
  useQuery({
    queryKey: ["employer", "candidate", profileId],
    queryFn: () => api.employer.candidate(profileId!),
    enabled: !!profileId,
  });
export const useShortlist = () => useQuery({ queryKey: ["employer", "shortlist"], queryFn: api.employer.shortlist });

export const useSaveOpportunity = () =>
  useRefreshAll(({ id, input }: { id?: string; input: import("@shared/schemas").OpportunityInput }) =>
    id ? api.employer.updateOpportunity(id, input) : api.employer.createOpportunity(input).then(() => undefined),
  );
export const useSetOpportunityOpen = () => useRefreshAll(({ id, open }: { id: string; open: boolean }) => api.employer.setOpen(id, open));
export const useDeleteOpportunity = () => useRefreshAll((id: string) => api.employer.deleteOpportunity(id));
export const useSetApplicationStatus = () =>
  useRefreshAll(({ id, status }: { id: string; status: import("./types").ApplicationStatusKey }) => api.employer.setStatus(id, status));
export const useAddToShortlist = () =>
  useRefreshAll(({ profileId, note }: { profileId: string; note?: string }) => api.employer.addToShortlist(profileId, note));
export const useRemoveFromShortlist = () => useRefreshAll((profileId: string) => api.employer.removeFromShortlist(profileId));

// ---------- Mentor ----------

export const useMentorOverview = () => useQuery({ queryKey: ["mentorArea", "overview"], queryFn: api.mentorArea.overview });
export const useMentorProfile = () => useQuery({ queryKey: ["mentorArea", "profile"], queryFn: api.mentorArea.profile });
export const useAcceptSession = () => useRefreshAll((id: string) => api.mentorArea.accept(id));
export const useDeclineSession = () =>
  useRefreshAll(({ id, reason }: { id: string; reason?: string }) => api.mentorArea.decline(id, reason));
export const useCompleteSession = () =>
  useRefreshAll(({ id, note }: { id: string; note?: string }) => api.mentorArea.complete(id, note));
export const useUpdateMentorProfile = () =>
  useRefreshAll((input: import("@shared/schemas").MentorProfileInput) => api.mentorArea.updateProfile(input));

// ---------- Admin ----------

export const useAdminOverview = () => useQuery({ queryKey: ["admin", "overview"], queryFn: api.admin.overview });
export const useAdminUsers = (role?: import("./types").Role) =>
  useQuery({ queryKey: ["admin", "users", role ?? "all"], queryFn: () => api.admin.users(role) });
