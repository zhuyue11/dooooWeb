import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMembers } from '@/lib/api';
import type { GroupMember } from '@/types/api';

export interface AssignableMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

export function useMembersData(groupId: string | undefined) {
  const { data: members = [], isLoading, error } = useQuery<GroupMember[]>({
    queryKey: ['members', groupId],
    queryFn: () => getMembers(groupId!),
    enabled: !!groupId,
  });

  const assignees = useMemo<AssignableMember[]>(
    () =>
      members
        .filter((m) => m.role !== 'VIEWER')
        .map((m) => ({
          id: m.userId,
          name: m.user?.name || '',
          email: m.user?.email || '',
          avatar: m.user?.avatar,
          role: m.role,
        })),
    [members],
  );

  return { members, assignees, isLoading, error };
}
