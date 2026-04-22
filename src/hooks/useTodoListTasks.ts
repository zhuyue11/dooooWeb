/**
 * Custom hook for loading to-do list tasks (unplanned and overdue).
 * Ported from dooooApp/components/calendar/useTodoListTasks.ts
 *
 * - Personal (no groupId): fetches pending tasks + assigned group tasks, filters to to-do items
 * - Group (groupId provided): fetches from GET /api/groups/:groupId/tasks?todo=true
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getTasks,
  getAssignedGroupTasks,
  getGroupTodoTasks,
} from '@/lib/api';
import type { Task } from '@/types/api';

function isTodo(t: { date?: string | null; dateType?: string }) {
  return !t.date || t.dateType === 'DUE';
}

export function useTodoListTasks(groupId?: string) {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // ── Group path: single API call returns { unplanned, overdue } ──
  const { data: groupTodoData, isLoading: loadingGroupTodo } = useQuery({
    queryKey: ['group-todo', groupId],
    queryFn: () => getGroupTodoTasks(groupId!, timezone),
    enabled: !!groupId,
  });

  // ── Personal path: fetch pending tasks + assigned group tasks, filter client-side ──
  const { data: personalTasks = [], isLoading: loadingPersonal } = useQuery({
    queryKey: ['todo-tasks'],
    queryFn: () => getTasks({ status: 'PENDING' }),
    enabled: !groupId,
  });

  const { data: assignedGroupTasks = [], isLoading: loadingAssigned } = useQuery({
    queryKey: ['todo-assigned-group-tasks'],
    queryFn: getAssignedGroupTasks,
    staleTime: 2 * 60 * 1000,
    enabled: !groupId,
  });

  const isLoading = groupId ? loadingGroupTodo : (loadingPersonal || loadingAssigned);

  const { unplannedTasks, overdueTasks } = useMemo(() => {
    if (groupId) {
      return {
        unplannedTasks: groupTodoData?.unplanned ?? [],
        overdueTasks: groupTodoData?.overdue ?? [],
      };
    }

    // Personal: filter to to-do items (no date or DUE dateType)
    const unplanned: Task[] = [];
    const overdue: Task[] = [];

    for (const task of personalTasks) {
      if (!isTodo(task)) continue;
      if (!task.date) unplanned.push(task);
      else overdue.push(task);
    }

    for (const task of assignedGroupTasks) {
      if (task.isCompleted) continue;
      if (!isTodo(task)) continue;
      if (!task.date) unplanned.push(task);
      else overdue.push(task);
    }

    return { unplannedTasks: unplanned, overdueTasks: overdue };
  }, [groupId, groupTodoData, personalTasks, assignedGroupTasks]);

  return {
    unplannedTasks,
    overdueTasks,
    todoListTasksCount: unplannedTasks.length,
    isLoading,
  };
}
