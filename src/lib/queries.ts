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
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.dashboard }),
  });
}

export function useApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApplyInput }) => api.apply(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dashboard });
      qc.invalidateQueries({ queryKey: keys.unread });
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
