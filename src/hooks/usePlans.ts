import { useQuery } from '@tanstack/react-query';
import { getPlans, getAllPlanExecutions, getPlan, getPlanTemplates, getPlanExecutions } from '@/lib/api';

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanExecutions() {
  return useQuery({
    queryKey: ['planExecutions'],
    queryFn: getAllPlanExecutions,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: () => getPlan(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanTemplates(planId: string | undefined) {
  return useQuery({
    queryKey: ['planTemplates', planId],
    queryFn: () => getPlanTemplates(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanExecutionsForPlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['planExecutions', planId],
    queryFn: () => getPlanExecutions(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}
