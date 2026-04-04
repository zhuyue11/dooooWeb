import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  createEvent,
  updateEvent,
} from '@/lib/api';
import type { CreateTaskRequest, UpdateTaskRequest, CreateEventRequest, UpdateEventRequest } from '@/types/api';

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    // Calendar queries
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-attending-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-event-instances'] });
    // To-do and dashboard queries
    queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['todo-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-week'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-upcoming'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-past'] });
  };
}

export function useItemMutations() {
  const invalidate = useInvalidateAll();

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskRequest) => createTask(data),
    onSuccess: invalidate,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) => updateTask(id, data),
    onSuccess: invalidate,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: invalidate,
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (id: string) => toggleTask(id),
    onSuccess: invalidate,
  });

  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventRequest) => createEvent(data),
    onSuccess: invalidate,
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventRequest }) => updateEvent(id, data),
    onSuccess: invalidate,
  });

  return {
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    toggleTaskMutation,
    createEventMutation,
    updateEventMutation,
  };
}
