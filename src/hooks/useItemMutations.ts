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

function useInvalidateCalendar() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-attending-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-event-instances'] });
  };
}

export function useItemMutations() {
  const invalidate = useInvalidateCalendar();

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
