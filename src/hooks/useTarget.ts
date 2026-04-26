import { useQuery } from '@tanstack/react-query';
import { getTarget } from '@/lib/api';

export function useTarget(targetId: string | undefined) {
  return useQuery({
    queryKey: ['target', targetId],
    queryFn: () => getTarget(targetId!),
    enabled: !!targetId,
    staleTime: 5 * 60 * 1000,
  });
}
