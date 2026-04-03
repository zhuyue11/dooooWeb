import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGroups } from '@/lib/api';

export function useGroups() {
  const query = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
    staleTime: 5 * 60 * 1000,
  });

  const groupNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of query.data ?? []) map[g.id] = g.name;
    return map;
  }, [query.data]);

  return { ...query, groupNameMap };
}
