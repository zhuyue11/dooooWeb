// Target & Plan feature types (adapted from dooooApp — no Local* SQLite types)

// ===== Target =====

export type TargetStatus = 'active' | 'completed' | 'archived';

export interface Target {
  id: string;
  name: string;
  description?: string;
  status: TargetStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
  targetPlans?: TargetPlan[];
  targetTasks?: TargetTask[];
}

// ===== Plan =====

export interface Plan {
  id: string;
  name: string;
  description?: string;
  userId?: string | null;
  isAiGenerated: boolean;
  archetype?: string | null;
  userPlanStatus?: UserPlanStatus | null;
  executionStatuses?: string[];
  createdAt: string;
  updatedAt: string;
  taskTemplates?: TaskTemplate[];
  eventTemplates?: EventTemplate[];
  targetPlans?: TargetPlan[];
}

export type UserPlanStatus = 'SAVED' | 'IN_PROGRESS' | 'COMPLETED';

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  status: UserPlanStatus;
  createdAt: string;
  updatedAt: string;
  plan?: Plan;
}

// ===== TaskTemplate =====

export interface TaskTemplate {
  id: string;
  planId: string;
  title: string;
  description?: string;
  duration?: number | null;
  time?: string | null;
  repeat?: string;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  orderIndex: number;
  gapDays: number;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ===== EventTemplate =====

export interface EventTemplate {
  id: string;
  planId: string;
  title: string;
  description?: string;
  duration?: number | null;
  time?: string | null;
  repeat?: string;
  firstReminderMinutes?: number | null;
  secondReminderMinutes?: number | null;
  orderIndex: number;
  gapDays: number;
  location?: string | null;
  meetingLink?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PlanTemplate = (TaskTemplate & { type: 'task' }) | (EventTemplate & { type: 'event' });

// ===== Plan Execution History =====

export interface PlanExecutionTaskInstance {
  id: string;
  taskId: string;
  title: string;
  description: string | null;
  date: string;
  status: string;
  completedAt: string | null;
}

export interface PlanExecutionEventInstance {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  date: string;
  status: string;
}

export interface PlanExecutionTask {
  id: string;
  title: string;
  status: string;
  isCompleted: boolean;
  isRecurring: boolean;
  completedInstances: number;
  totalOccurrences: number | null;
  date: string | null;
  hasTime: boolean;
  duration: number | null;
  priority: string | null;
  categoryId: string | null;
  instances: PlanExecutionTaskInstance[];
}

export interface PlanExecutionEvent {
  id: string;
  title: string;
  status: string;
  isRecurring: boolean;
  totalOccurrences: number | null;
  date: string | null;
  hasTime: boolean;
  duration: number | null;
  instances: PlanExecutionEventInstance[];
}

export interface PlanExecution {
  id: string;
  planId: string;
  planName: string;
  planDescription: string | null;
  isAiGenerated: boolean;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startDate: string;
  completedAt: string | null;
  createdAt: string;
  completedCount: number;
  totalCount: number;
  tasks: PlanExecutionTask[];
  events: PlanExecutionEvent[];
}

// ===== Plan List Helpers =====

export type PlanListItem =
  | { kind: 'plan'; data: Plan }
  | { kind: 'execution'; data: PlanExecution };

export type PlanFilter = 'all' | 'in_progress' | 'planned' | 'saved' | 'completed' | 'discovery';

// ===== Junction Tables =====

export interface TargetPlan {
  id: string;
  targetId: string;
  planId: string;
  userId: string;
  createdAt: string;
  target?: Target;
  plan?: Plan;
}

export interface TargetTask {
  id: string;
  targetId: string;
  taskId: string;
  userId: string;
  createdAt: string;
  target?: Target;
}

// ===== API Request/Response Types =====

export interface CreateTargetRequest {
  name: string;
  description?: string;
  status?: TargetStatus;
}

export interface UpdateTargetRequest {
  name?: string;
  description?: string;
  status?: TargetStatus;
}

export interface LinkTargetPlanRequest {
  targetId: string;
  planId: string;
}

export interface LinkTargetTaskRequest {
  targetId: string;
  taskId: string;
}

export interface TargetListResponse {
  targets: Target[];
}

export interface PlanListResponse {
  plans: Plan[];
}

export interface TaskTemplateListResponse {
  taskTemplates: TaskTemplate[];
  eventTemplates: EventTemplate[];
}

// Plan Execution
export interface ExecutePlanTaskInput {
  templateId: string;
  date: string;
  duration: number;
  title: string;
  description?: string;
  repeat?: string;
  firstReminderMinutes?: number;
  secondReminderMinutes?: number;
  instanceOverrides?: Array<{
    date: string;
    time: string;
  }>;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING';
  location?: string;
}

export interface ExecutePlanEventInput {
  templateId: string;
  title: string;
  description?: string;
  date: string;
  duration?: number;
  repeat?: string;
  location?: string;
  meetingLink?: string;
  firstReminderMinutes?: number;
  secondReminderMinutes?: number;
  timeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING';
}

export interface ExecutePlanInput {
  startDate: string;
  targetId?: string;
  tasks: ExecutePlanTaskInput[];
  events?: ExecutePlanEventInput[];
}

export interface ExecutedTaskDTO {
  id: string;
  templateId: string;
  title: string;
  date: string;
  hasTime: boolean;
  duration: number | null;
  repeat: unknown;
  planId: string;
}

export interface ExecutedEventDTO {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  date: string;
  hasTime: boolean;
  timeOfDay: string | null;
  duration: number | null;
  repeat: unknown;
  location: string | null;
  meetingLink: string | null;
  planId: string;
}

export interface ExecutePlanResponse {
  planId: string;
  tasksCreated: number;
  tasks: ExecutedTaskDTO[];
  eventsCreated: number;
  events: ExecutedEventDTO[];
}
