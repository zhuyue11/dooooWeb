/**
 * Custom hook for loading to-do list tasks.
 * Uses GET /api/tasks/todo which handles both personal and group contexts server-side.
 * To-do task = no date OR dateType='DUE', incomplete.
 * Results are pre-sorted by the backend: dated (overdue first) → no-date, by priority.
 */

import { useQuery } from '@tanstack/react-query';
import { getTodoTasks } from '@/lib/api';

export function useTodoListTasks(groupId?: string) {
  const { data: todoTasks = [], isLoading } = useQuery({
    queryKey: ['todo-tasks', groupId ?? null],
    queryFn: () => getTodoTasks(groupId),
  });

  return {
    todoTasks,
    todoListTasksCount: todoTasks.length,
    isLoading,
  };
}
