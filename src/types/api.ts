// API Types - Moved from ../lib/api.ts for better organization

// Task-related types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  date?: string; // Changed from dueDate to date to match frontend convention
  hasTime?: boolean;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  timeZone?: string | null;
  duration?: number | null; // Duration in minutes
  repeat?: Repeat;
  firstReminderMinutes?: number | null; // Minutes before date (null = no reminder, 0 = at time)
  secondReminderMinutes?: number | null; // Minutes before date (null = no reminder, 0 = at time)
  dateType?: 'SCHEDULED' | 'DUE'; // Indicates whether date is scheduled or due date
  showInTodoWhenOverdue?: boolean; // Show task in to-do list when overdue
  setToDoneAutomatically?: boolean; // Automatically mark task as completed when overdue
  isCompleted: boolean; // Boolean flag for completion status
  completedAt?: string;
  tags?: string[]; // Array of tag strings
  categoryId?: string;
  originalTaskId?: string; // Reference to the original task when this task is created from "update all future" operation
  groupId?: string; // Group ID if task belongs to a group
  assigneeId?: string; // User ID of the group member this task is assigned to (null = not assigned)
  assignee?: { // Assignee user details (populated from backend)
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  userId: string;
  planId?: string; // Plan ID if task was created from plan execution
  plan?: { id: string; name: string } | null; // Plan relation (included when backend joins plan)
  isForAllMembers?: boolean; // If true, creates participant-specific instances for each assigned user
  trackCompletion?: boolean; // Track individual participant completion for group activities (only used when isForAllMembers=true)
  createdAt: string;
  updatedAt: string;
  instances?: TaskInstance[]; // Task instances for recurring tasks
  participantInstances?: TaskParticipantInstance[]; // Participant instances for isForAllMembers tasks
  participants?: TaskParticipant[]; // Participants for recurring "Join All" group activities
  // Optional: included when backend uses `include: { user: { select: ... } }`
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Task participant for recurring group activities ("Join All" participation)
export interface TaskParticipant {
  id: string;
  taskId: string;
  userId: string;
  status: 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'LEFT';
  // When user started participating in all occurrences (for recurring tasks)
  // Used to determine which instances show checkbox (dates >= startParticipateTime)
  startParticipateTime?: string;
  // When user stopped participating in all occurrences (for "Leave All" action)
  // Past instances retain CONFIRMED status, only future instances are LEFT
  stoppedParticipatingAt?: string;
  createdAt: string;
  updatedAt: string;
  // Optional: included when backend uses `include: { user: { select: ... } }`
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Task participant instance for isForAllMembers group activities
// NOTE: Date is derived from templateTask.date (non-recurring) or taskInstance.date (recurring)
// No date field here - use JOINs to get the date
export interface TaskParticipantInstance {
  id: string;
  templateTaskId: string;
  taskInstanceId?: string; // Optional: link to TaskInstance for recurring tasks
  participantUserId: string;
  status: 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'LEFT';
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  showInTodoWhenOverdue?: boolean;
  setToDoneAutomatically?: boolean;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Participant user info (included for displaying avatars in task list)
  participantUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  // Task instance info (included for matching participantInstances to dates)
  taskInstance?: {
    id: string;
    date: string;
  };
}

// Participation status for group activities
export type ParticipationStatus = 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'LEFT' | 'NONE';

export interface ParticipationStatusResponse {
  status: ParticipationStatus;
  participateAll: boolean;
  isRecurring: boolean;
  taskDate: string;
}

// Completion stats for group activities with trackCompletion
export interface TaskCompletionStats {
  totalParticipants: number;
  completedCount: number;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    isCompleted: boolean;
    completedAt?: string;
  }>;
  notGoingParticipants?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  invitedParticipants?: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
}

// Repeat configuration for recurring tasks
export interface Repeat {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number; // e.g., every 2 days, every 3 weeks
  weekdays?: number[]; // 0-6 (Sunday-Saturday) for weekly/custom patterns
  weekdayPattern?: {
    weekday: number; // 0-6
    week: 'first' | 'second' | 'third' | 'fourth' | 'last'; // e.g., "first Monday"
  };
  endCondition?: {
    type: 'date' | 'count';
    endDate?: string; // ISO date string
    occurrences?: number;
  };
}

// Task instance for recurring tasks
export interface TaskInstance {
  id: string;
  taskId: string;
  userId?: string | null; // Instance owner (can be different from task owner for assigned instances)
  assigneeId?: string | null; // Assignee for group tasks (for recurring tasks not "for all members")
  assigneeName?: string | null; // Assignee's name
  date: string; // ISO date string for this specific instance
  status: 'PENDING' | 'COMPLETED' | 'REMOVED' | 'MODIFIED';
  title: string;
  description?: string;
  priority: string;
  hasTime?: boolean;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  timeZone?: string | null;
  duration?: number;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  categoryId?: string;
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  completedAt?: string; // ISO datetime when marked as completed
  customTime?: string; // ISO datetime if this instance has a different time
  showInTodoWhenOverdue: boolean; // Can be overridden per instance
  setToDoneAutomatically: boolean; // Can be overridden per instance
  dateType?: 'SCHEDULED' | 'DUE'; // Inherited from parent task
  groupId?: string; // Group ID from parent task
  createdAt: string;
  updatedAt: string;
  task: Task; // Parent task (required - get userId from task.userId)
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: string; // Backend expects 'Low', 'Medium', 'High', 'Urgent' (capitalized)
  date?: string; // Changed from dueDate to date
  hasTime?: boolean;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  itemType?: 'TASK' | 'EVENT'; // Discriminator — routes to task or event creation
  timeMode?: 'FIXED' | 'GLOBAL'; // Time zone handling mode
  timeZone?: string | null;
  endDate?: string | null; // End date for events
  endTimeZone?: string | null; // End timezone for events
  duration?: number; // Duration in minutes
  repeat?: Repeat; // Repeat object for recurring tasks
  firstReminderMinutes?: number; // Minutes before date (undefined = no reminder, 0 = at time)
  secondReminderMinutes?: number; // Minutes before date (undefined = no reminder, 0 = at time)
  dateType?: 'SCHEDULED' | 'DUE'; // Indicates whether date is scheduled or due date
  showInTodoWhenOverdue?: boolean; // Show task in to-do list when overdue
  setToDoneAutomatically?: boolean; // Automatically mark task as completed when overdue
  categoryId?: string;
  groupId?: string; // Group ID if task belongs to a group
  isForAllMembers?: boolean; // For group tasks: true = group activity (multiple assignees), false = single assignee
  trackCompletion?: boolean; // Track individual participant completion for group activities
  assigneeId?: string; // For non-group-activity tasks: single assignee user ID
  assignments?: string[]; // For group-activity tasks: array of assignee user IDs
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  guests?: Array<{email: string, name?: string}> | null; // For events: guest list
  meetingLink?: string | null; // For events: meeting link
  googleCalendarEventId?: string | null; // For events: Google Calendar event ID
  projectId?: string;
  originalRecurringTaskId?: string; // ID of the original recurring task when creating a split task for "update all future"
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'none' | 'None' | 'Low' | 'Medium' | 'High' | 'Urgent';
  date?: string | null; // ISO string or null for no date
  hasTime?: boolean;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  itemType?: 'TASK' | 'EVENT'; // Discriminator — routes to task or event update
  timeMode?: 'FIXED' | 'GLOBAL'; // Time zone handling mode
  timeZone?: string | null;
  endDate?: string | null; // End date for events
  endTimeZone?: string | null; // End timezone for events
  duration?: number | null;
  repeat?: Repeat | null; // null to remove repeat
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  dateType?: 'SCHEDULED' | 'DUE'; // Indicates whether date is scheduled or due date
  showInTodoWhenOverdue?: boolean; // Show task in to-do list when overdue
  setToDoneAutomatically?: boolean; // Automatically mark task as completed when overdue
  categoryId?: string | null;
  groupId?: string | null; // Group ID if task belongs to a group
  projectId?: string;
  labels?: string[];
  isForAllMembers?: boolean; // Whether task is distributed to all group members
  trackCompletion?: boolean; // Track individual participant completion for group activities
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  guests?: Array<{email: string, name?: string}> | null; // For events: guest list
  meetingLink?: string | null; // For events: meeting link
  googleCalendarEventId?: string | null; // For events: Google Calendar event ID
}

// ===== Event Types =====

export interface Event {
  id: string;
  title: string;
  description?: string | null;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null;
  date?: string | null;
  hasTime?: boolean;
  timeZone?: string | null;
  endDate?: string | null;
  endTimeZone?: string | null;
  duration?: number | null;
  repeat?: Repeat | null;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  guests?: Array<{email: string, name?: string}> | null;
  meetingLink?: string | null;
  googleCalendarEventId?: string | null;
  googleCalendarId?: string | null;
  syncSource?: string | null;
  syncedAt?: string | null;
  googleEtag?: string | null;
  color?: string | null;
  showAs?: string | null;
  visibility?: string | null;
  rrule?: string | null;
  groupId?: string | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventInstance {
  id: string;
  eventId: string;
  userId?: string | null;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REMOVED' | 'MODIFIED';
  eventStatus: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  priority?: string | null;
  date: string;
  hasTime?: boolean;
  timeZone?: string | null;
  endDate?: string | null;
  endTimeZone?: string | null;
  duration?: number | null;
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  guests?: Array<{email: string, name?: string}> | null;
  meetingLink?: string | null;
  googleCalendarEventId?: string | null;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  priority?: string;
  date?: string;
  hasTime?: boolean;
  timeZone?: string | null;
  endDate?: string | null;
  endTimeZone?: string | null;
  duration?: number;
  repeat?: Repeat;
  firstReminderMinutes?: number;
  secondReminderMinutes?: number;
  location?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  locationPlaceId?: string;
  guests?: Array<{email: string, name?: string}>;
  meetingLink?: string;
  googleCalendarEventId?: string;
  groupId?: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string | null;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  priority?: string | null;
  date?: string | null;
  hasTime?: boolean;
  timeZone?: string | null;
  endDate?: string | null;
  endTimeZone?: string | null;
  duration?: number | null;
  repeat?: Repeat | null;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  guests?: Array<{email: string, name?: string}> | null;
  meetingLink?: string | null;
  googleCalendarEventId?: string | null;
}

export interface EventAttendee {
  id: string;
  eventId: string;
  email: string;
  name: string | null;
  userId: string | null;
  responseStatus: 'NEEDS_ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
  isOrganizer: boolean;
  notifiedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RsvpRequest {
  responseStatus: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
}

export interface EventWithAttendees extends Event {
  attendees?: EventAttendee[];
}

export interface TaskListResponse {
  tasks: Task[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  projectId?: string;
  date?: string; // Changed from dueDate to date to match frontend convention
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  includeInstances?: boolean; // Include task instances in response
  fromDate?: string; // Start date for task instances
  toDate?: string; // End date for task instances
}

// Task Instance related types
// Unified task instance request interface
export interface TaskInstanceRequest {
  instanceDate?: string; // Date for the instance (required for create, optional for update)
  status?: 'PENDING' | 'COMPLETED' | 'REMOVED' | 'MODIFIED';
  hasTime?: boolean; // Whether the instance has a specific time
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  title?: string; // Override title for this instance
  description?: string; // Override description for this instance
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'none'; // Override priority
  categoryId?: string | null; // Override category
  firstReminderMinutes?: number | null; // Override first reminder
  secondReminderMinutes?: number | null; // Override second reminder
  duration?: number | null; // Override duration
}

// For creating: instanceDate is required in request body
export interface CreateTaskInstanceRequest extends TaskInstanceRequest {
  instanceDate: string; // Required: specifies which date this instance is for
}

// For updating: instanceDate is optional (date is already in URL path)
export type UpdateTaskInstanceRequest = TaskInstanceRequest;

// For converting a task instance to a new regular task
export interface ConvertInstanceToTaskRequest {
  title: string;
  description?: string;
  date: string; // ISO date string for the new task
  hasTime?: boolean;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'none';
  categoryId?: string | null;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  duration?: number | null;
  dateType?: 'SCHEDULED' | 'DUE';
  showInTodoWhenOverdue?: boolean;
  setToDoneAutomatically?: boolean;
  originalInstanceDate?: string; // Original date of the instance to mark as REMOVED (for date change scenarios)
}

/**
 * Body for POST /api/events/:eventId/instances/:instanceId?/convert
 *
 * Same shape as ConvertInstanceToTaskRequest but with event-only fields. Used by
 * the "Edit this occurrence" flow when the user changes title or date — backend
 * creates a new standalone event and marks the original occurrence REMOVED.
 */
export interface ConvertInstanceToEventRequest {
  title: string;
  description?: string | null;
  date: string; // ISO — new event's date
  hasTime?: boolean;
  timeZone?: string | null;
  endDate?: string | null;
  endTimeZone?: string | null;
  duration?: number | null;
  priority?: string | null;
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  guests?: Array<{ email: string; name?: string }> | null;
  meetingLink?: string | null;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  /** Required when no instanceId is supplied (i.e. converting a virtual occurrence). */
  originalInstanceDate?: string;
}

export interface CreateEventInstanceRequest {
  date: string; // ISO — required: which occurrence
  status?: 'PENDING' | 'COMPLETED' | 'REMOVED' | 'MODIFIED';
  title?: string;
  description?: string | null;
  hasTime?: boolean;
  timeZone?: string | null;
  endDate?: string | null;
  endTimeZone?: string | null;
  duration?: number | null;
  priority?: string | null;
  location?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationPlaceId?: string | null;
  guests?: Array<{ email: string; name?: string }> | null;
  meetingLink?: string | null;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
}

export type UpdateEventInstanceRequest = Partial<Omit<CreateEventInstanceRequest, 'date'>>;

export interface TaskInstancesResponse {
  success: boolean;
  data: {
    dateRange?: {
      from: string;
      to: string;
    };
    instances: TaskInstance[];
    totalInstances: number;
  };
}

// Category-related types
export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  userId: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesResponse {
  success: boolean;
  count: number;
  data: Category[];
}

export interface CreateCategoryRequest {
  name: string;
  color: string;
  groupId?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  color?: string;
}

// Group types
export interface Group {
  id: string;
  name: string;
  description?: string;
  color?: string; // Hex color code for group identity
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  unreadCount?: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  // Personal preferences for this member
  muteMessages?: boolean;
  muteTasks?: boolean;
  isStarred?: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
}

export interface GroupMemberPreferences {
  muteMessages: boolean;
  muteTasks: boolean;
  isStarred: boolean;
}

export interface GroupSettings {
  id: string;
  groupId: string;
  allowProjectCreation: boolean;
  allowTaskAssignment: boolean;
  defaultVisibility: 'PRIVATE' | 'PUBLIC';
  createdAt: string;
  updatedAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  invitedUserId?: string;
  invitedByUserId: string;
  invitedEmail?: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';
  invitationToken?: string; // For deep links
  shortCode?: string; // 6-digit code
  deliveryMethod?: 'EMAIL' | 'LINK' | 'BOTH'; // Delivery method
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  group?: Group;
  invitedBy?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface CreateGroupInvitationRequest {
  email?: string; // Optional for link-only invitations
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  deliveryMethod?: 'EMAIL' | 'LINK' | 'BOTH';
}

export interface CreateGroupInvitationResponse {
  invitation: {
    id: string;
    shortCode: string;
    invitationToken: string;
    expiresAt: string;
    deliveryMethod: 'EMAIL' | 'LINK' | 'BOTH';
  };
  whatsappMessage?: string; // Formatted share message if delivery includes link sharing
}

// Message types
export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  messageType?: 'USER' | 'SYSTEM';
  attachments?: any;
  replyToId?: string;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  readAt?: number; // Local timestamp when current user marked this message as read
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
  replyTo?: GroupMessage;
}

// Request/Response types
export interface CreateGroupRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface CreateMessageRequest {
  content: string;
  replyToId?: string;
}

export interface GroupListResponse {
  groups: Group[];
  count: number;
}

export interface GroupDetailsResponse {
  group: Group;
  members: GroupMember[];
  settings: GroupSettings;
}

export interface MessageListResponse {
  messages: GroupMessage[];
  count: number;
  hasMore: boolean;
}

export interface MessageReceiptSummary {
  deliveredCount: number;
  readCount: number;
  totalRecipients: number;
}

export interface AddMemberRequest {
  userId: string;
  role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface BulkAddMembersRequest {
  members: Array<{
    userId: string;
    role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  }>;
}

export interface CreateInvitationRequest {
  email: string;
  role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  assignedBy: string;
  assignedAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

// Notification types
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_DUE_SOON = 'TASK_DUE_SOON',
  TASK_OVERDUE = 'TASK_OVERDUE',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_COMMENT = 'TASK_COMMENT',
  TASK_MENTION = 'TASK_MENTION',
  PROJECT_INVITATION = 'PROJECT_INVITATION',
  GROUP_INVITATION = 'GROUP_INVITATION',
  PROJECT_MEMBER_JOINED = 'PROJECT_MEMBER_JOINED',
  GROUP_MEMBER_JOINED = 'GROUP_MEMBER_JOINED',
  GROUP_MEMBER_LEFT = 'GROUP_MEMBER_LEFT',
  GROUP_MEMBER_REMOVED = 'GROUP_MEMBER_REMOVED',
  GROUP_MEMBER_ROLE_CHANGED = 'GROUP_MEMBER_ROLE_CHANGED',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
  DAILY_DIGEST = 'DAILY_DIGEST',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  EVENT_INVITATION = 'EVENT_INVITATION',
  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_RSVP_CHANGED = 'EVENT_RSVP_CHANGED'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  data: any; // Notification metadata (taskTitle, userName, etc.) used to construct localized messages
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}