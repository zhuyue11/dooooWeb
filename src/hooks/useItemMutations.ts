import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  createEvent,
  updateEvent,
  deleteEvent,
  createTaskInstance,
  updateTaskInstance,
  deleteTaskInstance,
  convertTaskInstance,
  createEventInstance,
  updateEventInstance,
  deleteEventInstance,
  convertEventInstance,
} from '@/lib/api';
import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateEventRequest,
  UpdateEventRequest,
  CreateTaskInstanceRequest,
  UpdateTaskInstanceRequest,
  ConvertInstanceToTaskRequest,
  CreateEventInstanceRequest,
  UpdateEventInstanceRequest,
  ConvertInstanceToEventRequest,
} from '@/types/api';

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    // Calendar queries
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-task-instances'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-recurring-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-attending-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-event-instances'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-recurring-events'] });
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

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: invalidate,
  });

  // ── Task instance mutations (for "edit/delete this occurrence" of recurring tasks) ──

  const createTaskInstanceMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateTaskInstanceRequest }) =>
      createTaskInstance(taskId, data),
    onSuccess: invalidate,
  });

  const updateTaskInstanceMutation = useMutation({
    mutationFn: ({
      taskId,
      instanceId,
      data,
    }: {
      taskId: string;
      instanceId: string;
      data: UpdateTaskInstanceRequest;
    }) => updateTaskInstance(taskId, instanceId, data),
    onSuccess: invalidate,
  });

  const deleteTaskInstanceMutation = useMutation({
    mutationFn: ({ taskId, date }: { taskId: string; date: string }) =>
      deleteTaskInstance(taskId, date),
    onSuccess: invalidate,
  });

  const convertTaskInstanceMutation = useMutation({
    mutationFn: ({
      taskId,
      instanceId,
      data,
    }: {
      taskId: string;
      instanceId: string | null;
      data: ConvertInstanceToTaskRequest;
    }) => convertTaskInstance(taskId, instanceId, data),
    onSuccess: invalidate,
  });

  // ── Event instance mutations (for "edit/delete this occurrence" of recurring events) ──

  const createEventInstanceMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: CreateEventInstanceRequest }) =>
      createEventInstance(eventId, data),
    onSuccess: invalidate,
  });

  const updateEventInstanceMutation = useMutation({
    mutationFn: ({
      eventId,
      date,
      data,
    }: {
      eventId: string;
      date: string;
      data: UpdateEventInstanceRequest;
    }) => updateEventInstance(eventId, date, data),
    onSuccess: invalidate,
  });

  const deleteEventInstanceMutation = useMutation({
    mutationFn: ({ eventId, date }: { eventId: string; date: string }) =>
      deleteEventInstance(eventId, date),
    onSuccess: invalidate,
  });

  const convertEventInstanceMutation = useMutation({
    mutationFn: ({
      eventId,
      instanceId,
      data,
    }: {
      eventId: string;
      instanceId: string | null;
      data: ConvertInstanceToEventRequest;
    }) => convertEventInstance(eventId, instanceId, data),
    onSuccess: invalidate,
  });

  return {
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    toggleTaskMutation,
    createEventMutation,
    updateEventMutation,
    deleteEventMutation,
    createTaskInstanceMutation,
    updateTaskInstanceMutation,
    deleteTaskInstanceMutation,
    convertTaskInstanceMutation,
    createEventInstanceMutation,
    updateEventInstanceMutation,
    deleteEventInstanceMutation,
    convertEventInstanceMutation,
  };
}
