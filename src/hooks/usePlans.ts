import { useQuery } from '@tanstack/react-query';
import { getPlans, getAllPlanExecutions } from '@/lib/api';

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
