import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/lib/api';

export function useCategories(groupId?: string) {
  return useQuery({
    queryKey: groupId ? ['categories', 'group', groupId] : ['categories'],
    queryFn: () => getCategories(groupId),
    staleTime: 5 * 60 * 1000,
  });
}
