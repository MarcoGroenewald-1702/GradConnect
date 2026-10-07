// Server state with TanStack Query: data is fetched, cached and refreshed automatically.
// After a change (mutation) we "invalidate" the affected queries so they reload.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApplyInput, OnboardingInput, ProfileUpdateInput, ProjectEvidenceInput } from "@shared/schemas";
import { api } from "./api";

export const keys = {
  dashboard: ["dashboard"] as const,
  profile: ["profile"] as const,
  snapshot: ["profile", "snapshot"] as const,
  skills: ["skills"] as const,
  mySkills: ["skills", "mine"] as const,
  unread: ["notifications", "unread"] as const,
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
