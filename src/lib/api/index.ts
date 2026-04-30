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
  TaskParticipant,
  TaskParticipantInstance,
  ParticipationStatusResponse,
  TaskCompletionStats,
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
  PlanExecution,
  TargetTask,
  TargetPlan,
  CreateTargetRequest,
  UpdateTargetRequest,
  UserPlan,
  ExecutePlanInput,
  ExecutePlanResponse,
  PlanReview,
  PlanExecutionCompleted,
} from '@/types/target';
import type { User, AuthResponse, UpdateProfileRequest } from '@/types/navigation';
import type {
  PlanningSession,
  PlanningSessionListItem,
  CreateSessionRequest,
  SaveMessagesRequest,
} from '@/types/ai';

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

export async function toggleTask(id: string): Promise<{ task: Task; planExecutionCompleted: PlanExecutionCompleted | null }> {
  const res = await apiClient.patch<{ success: boolean; data: Task; planExecutionCompleted?: PlanExecutionCompleted }>(
    `/api/tasks/${id}/toggle`,
  );
  return { task: res.data.data, planExecutionCompleted: res.data.planExecutionCompleted ?? null };
}

// ===== Assigned Group Tasks =====

export async function getAssignedGroupTasks(): Promise<Task[]> {
  const res = await apiClient.get<{ success: boolean; data: Task[] }>('/api/tasks/assigned');
  return res.data.data;
}

// ===== To-Do List =====

export async function getTodoTasks(groupId?: string): Promise<Task[]> {
  const res = await apiClient.get<{ success: boolean; data: Task[] }>('/api/tasks/todo', {
    params: groupId ? { groupId } : undefined,
  });
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

export async function toggleTaskInstance(taskId: string, instanceId?: string, instanceDate?: string, currentStatus?: string): Promise<{ instance: TaskInstance; planExecutionCompleted: PlanExecutionCompleted | null }> {
  const res = await apiClient.patch<{ success: boolean; data: TaskInstance; planExecutionCompleted?: PlanExecutionCompleted }>(
    `/api/tasks/${taskId}/instances/toggle`,
    { instanceId, instanceDate, currentStatus },
  );
  return { instance: res.data.data, planExecutionCompleted: res.data.planExecutionCompleted ?? null };
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

// Group Member Preferences
export async function getGroupPreferences(groupId: string): Promise<GroupMemberPreferences> {
  const res = await apiClient.get<{ success: boolean; data: GroupMemberPreferences }>(`/api/groups/${groupId}/preferences`);
  return res.data.data;
}

export async function updateGroupPreferences(
  groupId: string,
  data: Partial<GroupMemberPreferences>,
): Promise<GroupMemberPreferences> {
  const res = await apiClient.put<{ success: boolean; data: GroupMemberPreferences }>(`/api/groups/${groupId}/preferences`, data);
  return res.data.data;
}

// Group Messages
export async function sendMessage(groupId: string, data: CreateMessageRequest): Promise<GroupMessage> {
  const res = await apiClient.post<{ success: boolean; data: GroupMessage }>(`/api/groups/${groupId}/messages`, data);
  return res.data.data;
}

export async function getMessages(groupId: string, page = 1, limit = 50): Promise<MessageListResponse> {
  const res = await apiClient.get<{ success: boolean; data: GroupMessage[]; count: number; hasMore: boolean; page: number; total: number }>(
    `/api/groups/${groupId}/messages`,
    { params: { page, limit } },
  );
  return { messages: res.data.data, count: res.data.count, hasMore: res.data.hasMore };
}

export async function editMessage(groupId: string, messageId: string, data: { content: string }): Promise<GroupMessage> {
  const res = await apiClient.put<{ success: boolean; data: GroupMessage }>(`/api/groups/${groupId}/messages/${messageId}`, data);
  return res.data.data;
}

export async function deleteMessage(groupId: string, messageId: string): Promise<void> {
  await apiClient.delete(`/api/groups/${groupId}/messages/${messageId}`);
}

export async function markMessagesRead(groupId: string, messageIds: string[]): Promise<void> {
  await apiClient.post(`/api/groups/${groupId}/messages/mark-read`, { messageIds });
}

export async function markMessageDelivered(groupId: string, messageId: string): Promise<void> {
  await apiClient.post(`/api/groups/${groupId}/messages/${messageId}/delivered`);
}

export async function getUndeliveredMessages(): Promise<{ messages: GroupMessage[]; count: number }> {
  const res = await apiClient.get<{ success: boolean; data: { messages: GroupMessage[]; count: number } }>('/api/messages/undelivered');
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

// ===== Collaboration (Group Activity Participation) =====

export async function getParticipationStatus(
  taskId: string,
  date?: string,
): Promise<ParticipationStatusResponse> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await apiClient.get<{ success: boolean; data: ParticipationStatusResponse }>(
    `/api/collaboration/tasks/${taskId}/participation-status`,
    { params },
  );
  return res.data.data;
}

export async function participateInTask(
  taskId: string,
  participationType: 'next' | 'all' | 'single',
  date?: string,
): Promise<void> {
  await apiClient.post(`/api/collaboration/tasks/${taskId}/participate`, { participationType, date });
}

export async function declineParticipation(taskId: string): Promise<void> {
  await apiClient.post(`/api/collaboration/tasks/${taskId}/decline`);
}

export async function leaveTask(
  taskId: string,
  leaveType: 'single' | 'all' = 'all',
  date?: string,
): Promise<void> {
  await apiClient.post(`/api/collaboration/tasks/${taskId}/leave`, { leaveType, date });
}

export async function markNotGoing(
  taskId: string,
  date: string,
  taskInstanceId?: string,
): Promise<void> {
  await apiClient.post(`/api/collaboration/tasks/${taskId}/not-going`, { date, taskInstanceId });
}

export async function inviteParticipants(
  taskId: string,
  userIds: string[],
  taskDate?: string,
): Promise<void> {
  await apiClient.post(`/api/collaboration/tasks/${taskId}/invite`, { userIds, taskDate });
}

export async function getTaskParticipants(taskId: string): Promise<TaskParticipant[]> {
  const res = await apiClient.get<{ success: boolean; data: TaskParticipant[] }>(
    `/api/collaboration/tasks/${taskId}/participants`,
  );
  return res.data.data;
}

export async function getTaskCompletionStats(taskId: string): Promise<TaskCompletionStats> {
  const res = await apiClient.get<{ success: boolean; data: TaskCompletionStats }>(
    `/api/tasks/${taskId}/completion-stats`,
  );
  return res.data.data;
}

export async function completeParticipantTask(
  taskId: string,
  isCompleted: boolean,
  date?: string,
): Promise<void> {
  await apiClient.put(`/api/collaboration/tasks/${taskId}/complete`, { isCompleted, date });
}

export async function manuallyCompleteGroupActivity(
  taskId: string,
  isCompleted: boolean,
  date?: string,
): Promise<void> {
  await apiClient.put(`/api/collaboration/tasks/${taskId}/manual-complete`, { isCompleted, date });
}

export async function completeParticipantInstance(
  taskId: string,
  instanceId: string,
  isCompleted: boolean,
): Promise<void> {
  await apiClient.put(
    `/api/collaboration/tasks/${taskId}/participant-instances/${instanceId}/complete`,
    { isCompleted },
  );
}

export async function getMyParticipantInstances(): Promise<TaskParticipantInstance[]> {
  const res = await apiClient.get<{ success: boolean; data: TaskParticipantInstance[] }>(
    '/api/collaboration/participant-instances/me',
  );
  return res.data.data;
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

export async function linkPlanToTarget(targetId: string, planId: string): Promise<TargetPlan> {
  const res = await apiClient.post<{ success: boolean; data: TargetPlan }>(`/api/targets/${targetId}/plans`, { planId });
  return res.data.data;
}

export async function unlinkPlanFromTarget(targetId: string, planId: string): Promise<void> {
  await apiClient.delete(`/api/targets/${targetId}/plans/${planId}`);
}

export async function linkTaskToTarget(targetId: string, taskId: string): Promise<TargetTask> {
  const res = await apiClient.post<{ success: boolean; data: TargetTask }>(`/api/targets/${targetId}/tasks`, { taskId });
  return res.data.data;
}

export async function unlinkTaskFromTarget(targetId: string, taskId: string): Promise<void> {
  await apiClient.delete(`/api/targets/${targetId}/tasks/${taskId}`);
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

export async function getAllPlanExecutions(): Promise<PlanExecution[]> {
  const res = await apiClient.get<{ success: boolean; data: PlanExecution[] }>('/api/plans/executions');
  return res.data.data;
}

export async function getPlanExecutions(planId: string): Promise<PlanExecution[]> {
  const res = await apiClient.get<{ success: boolean; data: PlanExecution[] }>(`/api/plans/${planId}/executions`);
  return res.data.data;
}

export async function deletePlan(planId: string): Promise<void> {
  await apiClient.delete(`/api/plans/${planId}`);
}

export async function savePlan(planId: string): Promise<UserPlan> {
  const res = await apiClient.post<{ success: boolean; data: UserPlan }>(`/api/plans/${planId}/save`);
  return res.data.data;
}

export async function unsavePlan(planId: string): Promise<void> {
  await apiClient.delete(`/api/plans/${planId}/save`);
}

export async function getPublicPlan(planId: string): Promise<Plan> {
  const res = await apiClient.get<{ success: boolean; data: Plan }>(`/api/plans/public/${planId}`);
  return res.data.data;
}

// ===== Plan Reviews & Execution Management =====

export async function submitPlanReview(planId: string, score: number, note?: string): Promise<PlanReview> {
  const res = await apiClient.post<{ success: boolean; data: PlanReview }>(`/api/plans/${planId}/review`, { score, note });
  return res.data.data;
}

export async function getPlanExecutionStatus(planId: string, executionId: string): Promise<{ id: string; planId: string; status: 'IN_PROGRESS' | 'COMPLETED' }> {
  const res = await apiClient.get<{ success: boolean; data: { id: string; planId: string; status: 'IN_PROGRESS' | 'COMPLETED' } }>(`/api/plans/${planId}/executions/${executionId}`);
  return res.data.data;
}

export async function deletePlanExecutionData(planId: string, executionId: string): Promise<{ planId: string; executionId: string; deletedCount: number; deletedTaskIds: string[]; deletedEventIds: string[] }> {
  const res = await apiClient.delete<{ success: boolean; data: { planId: string; executionId: string; deletedCount: number; deletedTaskIds: string[]; deletedEventIds: string[] } }>(`/api/plans/${planId}/executions/${executionId}`);
  return res.data.data;
}

// ===== Notifications =====

export async function getNotifications(): Promise<Notification[]> {
  const res = await apiClient.get<{ success: boolean; data: Notification[] }>('/api/notifications/user');
  return res.data.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get<{ success: boolean; data: { unreadCount: number } }>('/api/notifications/user/unread-count');
  return res.data.data.unreadCount;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiClient.put(`/api/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.put('/api/notifications/mark-all-read');
}

export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`/api/notifications/${id}`);
}

// ===== Search =====

export async function searchTasks(params: {
  search?: string;
  priority?: string;
  categoryId?: string;
  planId?: string;
  targetId?: string;
  groupId?: string;
  dateFrom?: string;
  dateTo?: string;
  overdueOnly?: boolean;
  completedOnly?: boolean;
  scope: 'personal' | 'group' | 'all';
}): Promise<Task[]> {
  const query: Record<string, string> = { scope: params.scope };
  if (params.search) query.search = params.search;
  if (params.priority) query.priority = params.priority;
  if (params.categoryId) query.categoryId = params.categoryId;
  if (params.planId) query.planId = params.planId;
  if (params.targetId) query.targetId = params.targetId;
  if (params.groupId) query.groupId = params.groupId;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  if (params.overdueOnly) query.overdueOnly = 'true';
  if (params.completedOnly) query.completedOnly = 'true';

  const res = await apiClient.get<{ success: boolean; count: number; data: Task[] }>(
    '/api/tasks/search',
    { params: query },
  );
  return res.data.data;
}

export async function searchEvents(params: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Event[]> {
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;

  const res = await apiClient.get<{ success: boolean; count: number; data: Event[] }>(
    '/api/events/search',
    { params: query },
  );
  return res.data.data;
}

// ===== AI Planning Sessions =====

export async function listAISessions(): Promise<PlanningSessionListItem[]> {
  const res = await apiClient.get<{ success: boolean; data: PlanningSessionListItem[] }>('/api/ai/sessions');
  return res.data.data;
}

export async function getActiveAISession(): Promise<PlanningSession | null> {
  const res = await apiClient.get<{ success: boolean; data: PlanningSession | null }>('/api/ai/sessions/active');
  return res.data.data;
}

export async function getAISession(sessionId: string): Promise<PlanningSession> {
  const res = await apiClient.get<{ success: boolean; data: PlanningSession }>(`/api/ai/sessions/${sessionId}`);
  return res.data.data;
}

export async function createAISession(data: CreateSessionRequest): Promise<PlanningSession> {
  const res = await apiClient.post<{ success: boolean; data: PlanningSession }>('/api/ai/sessions', data);
  return res.data.data;
}

export async function saveAISessionMessages(sessionId: string, messages: SaveMessagesRequest['messages']): Promise<void> {
  await apiClient.put(`/api/ai/sessions/${sessionId}/messages`, { messages });
}

export async function deleteAISession(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/ai/sessions/${sessionId}`);
}

export async function completeAISession(sessionId: string): Promise<void> {
  await apiClient.post(`/api/ai/sessions/${sessionId}/complete`);
}

// ── Notes ──────────────────────────────────────────────────────────────

export interface NoteUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: NoteUser;
}

export interface NotesListResponse {
  notes: Note[];
  total: number;
  page: number;
  pages: number;
}

export async function getNotes(itemType: string, itemId: string, page = 1, limit = 50): Promise<NotesListResponse> {
  const { data } = await apiClient.get(`/api/notes/${itemType}/${itemId}`, { params: { page, limit } });
  return data.data;
}

export async function addNote(itemType: string, itemId: string, content: string): Promise<Note> {
  const { data } = await apiClient.post(`/api/notes/${itemType}/${itemId}`, { content });
  return data.data;
}

export async function updateNote(noteId: string, content: string): Promise<Note> {
  const { data } = await apiClient.put(`/api/notes/${noteId}`, { content });
  return data.data;
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiClient.delete(`/api/notes/${noteId}`);
}
