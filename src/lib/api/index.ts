import type { AxiosResponse } from 'axios';
import { apiClient } from './client';
import { STORAGE_KEYS } from '../config';
import type {
  Task,
  TaskInstance,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
  TaskFilters,
  CreateTaskInstanceRequest,
  UpdateTaskInstanceRequest,
  ConvertInstanceToTaskRequest,
  TaskInstancesResponse,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  Group,
  GroupMember,
  GroupMemberPreferences,
  GroupSettings,
  GroupInvitation,
  GroupMessage,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateMessageRequest,
  GroupDetailsResponse,
  MessageListResponse,
  AddMemberRequest,
  BulkAddMembersRequest,
  CreateGroupInvitationRequest,
  CreateGroupInvitationResponse,
  TaskAssignment,
  Notification,
  Event,
  EventInstance,
  EventAttendee,
  CreateEventRequest,
  UpdateEventRequest,
  CreateEventInstanceRequest,
  UpdateEventInstanceRequest,
  ConvertInstanceToEventRequest,
  RsvpRequest,
} from '@/types/api';
import type {
  Target,
  Plan,
  PlanTemplate,
  TargetTask,
  TargetPlan,
  CreateTargetRequest,
  UpdateTargetRequest,
  UserPlan,
  ExecutePlanInput,
  ExecutePlanResponse,
} from '@/types/target';
import type { User, AuthResponse, UpdateProfileRequest } from '@/types/navigation';

// ===== Auth =====

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/api/auth/login', { email, password });
  return res.data;
}

export async function register(email: string, password: string, name: string, invitationCode?: string): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/api/auth/register', { email, password, name, invitationCode });
  return res.data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await apiClient.post('/api/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const res = await apiClient.post('/api/auth/reset-password', { token, password });
  return res.data;
}

export async function getCurrentUser(): Promise<User> {
  const res = await apiClient.get<{ success: boolean; data: { user: User } }>('/api/auth/me');
  return res.data.data.user;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<User> {
  const res = await apiClient.patch<{ success: boolean; data: User }>('/api/users/profile', data);
  return res.data.data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await apiClient.patch('/api/users/change-password', { currentPassword, newPassword });
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout');
  } finally {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
}

// ===== Tasks =====

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  const res = await apiClient.get<{ success: boolean; data: Task[] }>('/api/tasks', { params: filters });
  return res.data.data;
}

export async function getTask(id: string): Promise<Task> {
  const res = await apiClient.get<{ success: boolean; data: Task }>(`/api/tasks/${id}`);
  return res.data.data;
}

export async function createTask(data: CreateTaskRequest): Promise<Task> {
  const res = await apiClient.post<{ success: boolean; data: Task }>('/api/tasks', data);
  return res.data.data;
}

export async function updateTask(id: string, data: UpdateTaskRequest): Promise<Task> {
  const res = await apiClient.patch<{ success: boolean; data: Task }>(`/api/tasks/${id}`, data);
  return res.data.data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/api/tasks/${id}`);
}

export async function toggleTask(id: string): Promise<Task> {
  const res = await apiClient.patch<{ success: boolean; data: Task }>(`/api/tasks/${id}/toggle`);
  return res.data.data;
}

// ===== Assigned Group Tasks =====

export async function getAssignedGroupTasks(): Promise<Task[]> {
  const res = await apiClient.get<{ success: boolean; data: Task[] }>('/api/tasks/assigned');
  return res.data.data;
}

// ===== Task Instances =====

export async function getTaskInstances(params?: { from?: string; to?: string }): Promise<TaskInstancesResponse> {
  const res = await apiClient.get<TaskInstancesResponse>('/api/tasks/instances', { params });
  return res.data;
}

/**
 * Fetch every recurring (repeat IS NOT NULL) personal task for the user.
 *
 * Used by the calendar to load recurring tasks once per session, since the
 * date-range `getTasks` query only returns tasks whose start date falls in
 * the visible week. Mirrors `getRecurringEvents` (already exposed in backend).
 */
export async function getRecurringTasks(): Promise<Task[]> {
  const res = await apiClient.get<{ success: boolean; data: Task[] }>('/api/tasks/recurring');
  return res.data.data;
}

export async function createTaskInstance(taskId: string, data: CreateTaskInstanceRequest): Promise<TaskInstance> {
  const res = await apiClient.post<{ success: boolean; data: TaskInstance }>(`/api/tasks/${taskId}/instances`, data);
  return res.data.data;
}

export async function updateTaskInstance(taskId: string, instanceId: string, data: UpdateTaskInstanceRequest): Promise<TaskInstance> {
  const res = await apiClient.patch<{ success: boolean; data: TaskInstance }>(`/api/tasks/${taskId}/instances/${instanceId}`, data);
  return res.data.data;
}

export async function deleteTaskInstance(taskId: string, date: string): Promise<TaskInstance> {
  const res = await apiClient.delete<{ success: boolean; data: TaskInstance }>(`/api/tasks/${taskId}/instances/${date}`);
  return res.data.data;
}

export async function toggleTaskInstance(taskId: string, instanceId?: string, instanceDate?: string, currentStatus?: string): Promise<TaskInstance> {
  const res = await apiClient.patch<{ success: boolean; data: TaskInstance }>(`/api/tasks/${taskId}/instances/toggle`, { instanceId, instanceDate, currentStatus });
  return res.data.data;
}

/**
 * Convert a single occurrence of a recurring task into a new standalone task,
 * marking the original occurrence as REMOVED. Transactional on the backend.
 *
 * Pass `instanceId` when a stored TaskInstance already exists for the occurrence
 * (i.e. it was previously MODIFIED). Pass `null` for virtual occurrences — in
 * that case `data.originalInstanceDate` is required so the backend knows which
 * date to mark REMOVED.
 */
export async function convertTaskInstance(
  taskId: string,
  instanceId: string | null,
  data: ConvertInstanceToTaskRequest,
): Promise<Task> {
  const url = instanceId
    ? `/api/tasks/${taskId}/instances/${instanceId}/convert`
    : `/api/tasks/${taskId}/instances/convert`;
  const res = await apiClient.post<{ success: boolean; data: Task }>(url, data);
  return res.data.data;
}

// ===== Categories =====

export async function getCategories(groupId?: string): Promise<Category[]> {
  const params = groupId ? { groupId } : {};
  const res = await apiClient.get<{ success: boolean; data: Category[] }>('/api/categories', { params });
  return res.data.data;
}

export async function createCategory(data: CreateCategoryRequest): Promise<Category> {
  const res = await apiClient.post<{ success: boolean; data: Category }>('/api/categories', data);
  return res.data.data;
}

export async function updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
  const res = await apiClient.put<{ success: boolean; data: Category }>(`/api/categories/${id}`, data);
  return res.data.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/api/categories/${id}`);
}

// ===== Events =====

export async function getEvents(params?: { from?: string; to?: string }): Promise<Event[]> {
  const res = await apiClient.get<{ success: boolean; data: Event[] }>('/api/events', { params });
  return res.data.data;
}

export async function getEvent(id: string): Promise<Event> {
  const res = await apiClient.get<{ success: boolean; data: Event }>(`/api/events/${id}`);
  return res.data.data;
}

export async function createEvent(data: CreateEventRequest): Promise<Event> {
  const res = await apiClient.post<{ success: boolean; data: Event }>('/api/events', data);
  return res.data.data;
}

export async function updateEvent(id: string, data: UpdateEventRequest): Promise<Event> {
  const res = await apiClient.patch<{ success: boolean; data: Event }>(`/api/events/${id}`, data);
  return res.data.data;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/api/events/${id}`);
}

export async function rsvpEvent(eventId: string, data: RsvpRequest): Promise<EventAttendee> {
  const res = await apiClient.post<{ success: boolean; data: EventAttendee }>(`/api/events/${eventId}/rsvp`, data);
  return res.data.data;
}

export async function getAttendingEvents(params?: { from?: string; to?: string }): Promise<Event[]> {
  const res = await apiClient.get<{ success: boolean; data: Event[] }>('/api/events/attending', { params });
  return res.data.data;
}

export async function getUserEventInstances(params: { from: string; to: string }): Promise<EventInstance[]> {
  const res = await apiClient.get<{ success: boolean; data: EventInstance[] }>('/api/event-instances', { params });
  return res.data.data;
}

/**
 * Fetch every recurring (repeat IS NOT NULL) personal event for the user.
 *
 * Same purpose as getRecurringTasks but for events. This endpoint already
 * exists in the backend at `GET /api/events/recurring` and is unused by
 * dooooWeb today.
 */
export async function getRecurringEvents(): Promise<Event[]> {
  const res = await apiClient.get<{ success: boolean; data: Event[] }>('/api/events/recurring');
  return res.data.data;
}

export async function createEventInstance(eventId: string, data: CreateEventInstanceRequest): Promise<EventInstance> {
  const res = await apiClient.post<{ success: boolean; data: EventInstance }>(`/api/events/${eventId}/instances`, data);
  return res.data.data;
}

/**
 * Update an existing stored event instance. Note the backend keys event instances
 * by `(eventId, date)`, not by instance id, so the URL takes the *date string* of
 * the original occurrence, not the instance row id.
 */
export async function updateEventInstance(
  eventId: string,
  date: string,
  data: UpdateEventInstanceRequest,
): Promise<EventInstance> {
  const res = await apiClient.patch<{ success: boolean; data: EventInstance }>(
    `/api/events/${eventId}/instances/${date}`,
    data,
  );
  return res.data.data;
}

export async function deleteEventInstance(eventId: string, date: string): Promise<void> {
  await apiClient.delete(`/api/events/${eventId}/instances/${date}`);
}

/**
 * Convert a single occurrence of a recurring event into a new standalone event,
 * marking the original occurrence as REMOVED. Transactional on the backend.
 *
 * Pass `instanceId` when a stored EventInstance already exists for the occurrence.
 * Pass `null` for virtual occurrences — `data.originalInstanceDate` is required
 * in that case.
 */
export async function convertEventInstance(
  eventId: string,
  instanceId: string | null,
  data: ConvertInstanceToEventRequest,
): Promise<Event> {
  const url = instanceId
    ? `/api/events/${eventId}/instances/${instanceId}/convert`
    : `/api/events/${eventId}/instances/convert`;
  const res = await apiClient.post<{ success: boolean; data: Event }>(url, data);
  return res.data.data;
}

export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const res = await apiClient.get<{ success: boolean; data: EventAttendee[] }>(`/api/events/${eventId}/attendees`);
  return res.data.data;
}

// ===== Groups =====

export async function getGroups(): Promise<Group[]> {
  const res = await apiClient.get<{ success: boolean; data: Group[] }>('/api/groups');
  return res.data.data;
}

export async function getGroup(groupId: string): Promise<GroupDetailsResponse> {
  const res = await apiClient.get<{ success: boolean; data: GroupDetailsResponse }>(`/api/groups/${groupId}`);
  return res.data.data;
}

export async function createGroup(data: CreateGroupRequest): Promise<Group> {
  const res = await apiClient.post<{ success: boolean; data: Group }>('/api/groups', data);
  return res.data.data;
}

export async function updateGroup(groupId: string, data: UpdateGroupRequest): Promise<Group> {
  const res = await apiClient.put<{ success: boolean; data: Group }>(`/api/groups/${groupId}`, data);
  return res.data.data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/api/groups/${groupId}`);
}

// Group Members
export async function getMembers(groupId: string): Promise<GroupMember[]> {
  const res = await apiClient.get<{ success: boolean; data: GroupMember[] }>(`/api/groups/${groupId}/members`);
  return res.data.data;
}

export async function addGroupMember(groupId: string, data: AddMemberRequest): Promise<GroupMember> {
  const res = await apiClient.post<{ success: boolean; data: GroupMember }>(`/api/groups/${groupId}/members`, data);
  return res.data.data;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await apiClient.delete(`/api/groups/${groupId}/members/${userId}`);
}

export async function updateGroupMemberRole(groupId: string, userId: string, role: string): Promise<GroupMember> {
  const res = await apiClient.put<{ success: boolean; data: GroupMember }>(`/api/groups/${groupId}/members/${userId}`, { role });
  return res.data.data;
}

// Group Messages
export async function sendMessage(groupId: string, data: CreateMessageRequest): Promise<GroupMessage> {
  const res = await apiClient.post<{ success: boolean; data: GroupMessage }>(`/api/groups/${groupId}/messages`, data);
  return res.data.data;
}

export async function getMessages(groupId: string, page = 1, limit = 50): Promise<MessageListResponse> {
  const res = await apiClient.get<{ success: boolean; data: MessageListResponse }>(`/api/groups/${groupId}/messages`, { params: { page, limit } });
  return res.data.data;
}

// Group Tasks & Events
export async function getGroupTasks(
  groupId: string,
  filters?: { from?: string; to?: string; recurring?: boolean; status?: string; priority?: string },
): Promise<Task[]> {
  const params: Record<string, string> = {};
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.recurring) params.recurring = 'true';
  if (filters?.status) params.status = filters.status;
  if (filters?.priority) params.priority = filters.priority;
  const res = await apiClient.get<{ success: boolean; data: Task[] }>(`/api/groups/${groupId}/tasks`, { params });
  return res.data.data;
}

export async function getGroupTodoTasks(
  groupId: string,
  timezone: string,
): Promise<{ unplanned: Task[]; overdue: Task[] }> {
  const res = await apiClient.get<{ success: boolean; data: { unplanned: Task[]; overdue: Task[] } }>(
    `/api/groups/${groupId}/tasks`,
    { params: { todo: 'true', timezone } },
  );
  return res.data.data;
}

export async function getGroupEvents(
  groupId: string,
  params?: { from?: string; to?: string },
): Promise<Event[]> {
  const qp: Record<string, string> = {};
  if (params?.from) qp.from = params.from;
  if (params?.to) qp.to = params.to;
  const res = await apiClient.get<{ success: boolean; data: Event[] }>(`/api/groups/${groupId}/events`, { params: qp });
  return res.data.data;
}

export async function getRecurringGroupEvents(groupId: string): Promise<Event[]> {
  const res = await apiClient.get<{ success: boolean; data: Event[] }>(`/api/groups/${groupId}/events/recurring`);
  return res.data.data;
}

// Group Invitations
export async function createGroupInvitation(groupId: string, data: CreateGroupInvitationRequest): Promise<CreateGroupInvitationResponse> {
  const res = await apiClient.post<{ success: boolean; data: CreateGroupInvitationResponse }>(`/api/groups/${groupId}/invitations`, data);
  return res.data.data;
}

export async function acceptGroupInvitation(invitationId: string): Promise<void> {
  await apiClient.post(`/api/invitations/${invitationId}/accept`);
}

export async function declineGroupInvitation(invitationId: string): Promise<void> {
  await apiClient.post(`/api/invitations/${invitationId}/decline`);
}

export async function getGroupInvitations(groupId: string): Promise<GroupInvitation[]> {
  const res = await apiClient.get<{ success: boolean; data: GroupInvitation[] }>(`/api/groups/${groupId}/invitations`);
  return res.data.data;
}

export async function cancelGroupInvitation(groupId: string, invitationId: string): Promise<void> {
  await apiClient.delete(`/api/groups/${groupId}/invitations/${invitationId}`);
}

// ===== Targets =====

export async function getTargets(): Promise<Target[]> {
  const res = await apiClient.get<{ success: boolean; data: Target[] }>('/api/targets');
  return res.data.data;
}

export async function getTarget(id: string): Promise<Target> {
  const res = await apiClient.get<{ success: boolean; data: Target }>(`/api/targets/${id}`);
  return res.data.data;
}

export async function createTarget(data: CreateTargetRequest): Promise<Target> {
  const res = await apiClient.post<{ success: boolean; data: Target }>('/api/targets', data);
  return res.data.data;
}

export async function updateTarget(id: string, data: UpdateTargetRequest): Promise<Target> {
  const res = await apiClient.put<{ success: boolean; data: Target }>(`/api/targets/${id}`, data);
  return res.data.data;
}

export async function deleteTarget(id: string): Promise<void> {
  await apiClient.delete(`/api/targets/${id}`);
}

// ===== Plans =====

export async function getPlans(): Promise<Plan[]> {
  const res = await apiClient.get<{ success: boolean; data: Plan[] }>('/api/plans');
  return res.data.data;
}

export async function getPlan(id: string): Promise<Plan> {
  const res = await apiClient.get<{ success: boolean; data: Plan }>(`/api/plans/${id}`);
  return res.data.data;
}

export async function getPlanTemplates(planId: string): Promise<PlanTemplate[]> {
  const res = await apiClient.get<{ success: boolean; data: PlanTemplate[] }>(`/api/plans/${planId}/templates`);
  return res.data.data;
}

export async function executePlan(planId: string, data: ExecutePlanInput): Promise<ExecutePlanResponse> {
  const res = await apiClient.post<{ success: boolean; data: ExecutePlanResponse }>(`/api/plans/${planId}/execute`, data);
  return res.data.data;
}

// ===== Notifications =====

export async function getNotifications(): Promise<Notification[]> {
  const res = await apiClient.get<{ success: boolean; data: Notification[] }>('/api/notifications');
  return res.data.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get<{ success: boolean; data: { count: number } }>('/api/notifications/unread-count');
  return res.data.data.count;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiClient.patch(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.patch('/api/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/api/notifications/${id}`);
}

// ===== Search =====

export async function searchTasks(params: { query?: string; status?: string; priority?: string; categoryId?: string; fromDate?: string; toDate?: string; page?: number; limit?: number }): Promise<{ tasks: Task[]; total: number }> {
  const res = await apiClient.get<{ success: boolean; data: { tasks: Task[]; total: number } }>('/api/tasks/search', { params });
  return res.data.data;
}
