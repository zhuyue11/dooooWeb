import { useQuery } from '@tanstack/react-query';
import { getTargets } from '@/lib/api';

export function useTargets() {
  return useQuery({
    queryKey: ['targets'],
    queryFn: getTargets,
    staleTime: 5 * 60 * 1000,
  });
}
