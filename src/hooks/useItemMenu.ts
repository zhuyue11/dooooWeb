/**
 * useItemMenu — builds the 3-dots menu items for task/event detail views.
 *
 * Centralizes all permission checks and context computation, directly matching
 * dooooApp's useDooooPanelLogic (lines 389-476) + DooooPanelView menu wiring.
 *
 * Both ItemSidePanel and ItemViewPage call this hook instead of computing
 * context values inline.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/auth-context';
import { useParticipationMutations } from '@/hooks/useParticipationMutations';
import { buildItemMenuItems } from '@/utils/itemMenuItems';
import type { ItemMenuItem, ItemMenuContext } from '@/utils/itemMenuItems';

interface ItemMenuInput {
  /** Item type */
  itemType: 'TASK' | 'EVENT';
  /** Item owner user ID */
  userId?: string;
  /** Is the item completed? */
  isCompleted: boolean;
  /** Group ID if group task */
  groupId?: string;
  /** Is this a group activity (isForAllMembers)? */
  isForAllMembers?: boolean;
  /** Track per-participant completion? */
  trackCompletion?: boolean;
  /** Has repeat pattern? */
  isRecurring: boolean;
  /** Parent task completed by organizer? */
  parentTaskIsCompleted?: boolean;
  /** Current user's participation status (from participantInstanceStatus) */
  participantInstanceStatus?: string;
  /** Item date (ISO string) */
  date?: string | null;
  /** Has specific time? */
  hasTime: boolean;
  /** Date type */
  dateType?: 'SCHEDULED' | 'DUE';
  /** Duration in minutes */
  duration?: number | null;
  /** Assignee user ID */
  assigneeId?: string | null;
  /** Participants array (for "Join All" recurring check) */
  participants?: Array<{ userId: string; status: string }>;
  /** Task ID to use for mutations */
  taskId: string;
  /** Occurrence date key for recurring instance mutations */
  occurrenceDateKey: string;
}

interface ItemMenuCallbackOverrides {
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleComplete?: () => void;
  onInvite?: () => void;
}

// ── Timing helpers (matching dooooApp/lib/utils.ts) ──

function isTaskStarted(date: string | null | undefined, hasTime: boolean): boolean {
  if (!date) return false;
  const now = new Date();
  const taskDate = new Date(date);
  if (hasTime) return now >= taskDate;
  // All-day: started if today >= task date
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDayStart = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
  return todayStart >= taskDayStart;
}

function canCompleteActivity(date: string | null | undefined, hasTime: boolean, dateType?: string): boolean {
  if (dateType === 'DUE') return true;
  if (!date) return true;
  return isTaskStarted(date, hasTime);
}

function hasActivityEnded(date: string | null | undefined, hasTime: boolean, duration?: number): boolean {
  if (!date) return false;
  const now = new Date();
  const taskDate = new Date(date);
  if (hasTime) {
    const durationMs = (duration || 0) * 60 * 1000;
    const endTime = new Date(taskDate.getTime() + durationMs);
    return now >= endTime;
  }
  // All-day: ended starting the next day
  const nextDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate() + 1);
  return now >= nextDay;
}

export function useItemMenu(
  input: ItemMenuInput,
  callbacks: ItemMenuCallbackOverrides,
): ItemMenuItem[] {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { participateMutation, declineMutation, leaveMutation, notGoingMutation, completeMutation, manualCompleteMutation } = useParticipationMutations(input.taskId);

  const currentUserId = user?.id;
  const isEvent = input.itemType === 'EVENT';
  const isGroupActivity = !!input.isForAllMembers;
  const isOrganizer = isGroupActivity && input.userId === currentUserId;

  // ── Permission checks (matching dooooApp useDooooPanelLogic lines 419-462) ──

  // canUserCompleteTask — can the user toggle the task's own completion?
  const canComplete = useMemo(() => {
    if (isEvent) return false;
    if (input.assigneeId) return input.assigneeId === currentUserId;
    return true;
  }, [isEvent, input.assigneeId, currentUserId]);

  // canUserEditTask
  const canEdit = useMemo(() => {
    if (isEvent) return true;
    if (input.isCompleted) return false;
    if (!input.groupId) return true;
    // Group tasks: only organizer can edit, and only before start
    if (isTaskStarted(input.date, input.hasTime)) return false;
    return input.userId === currentUserId;
  }, [isEvent, input.isCompleted, input.groupId, input.date, input.hasTime, input.userId, currentUserId]);

  // canUserDeleteTask — organizer can always delete; non-group = owner can delete
  const canDelete = useMemo(() => {
    if (isEvent) return true;
    if (!input.groupId) return true;
    return input.userId === currentUserId;
  }, [isEvent, input.groupId, input.userId, currentUserId]);

  // canManuallyComplete — organizer can end activity after it has ended
  const canManuallyComplete = useMemo(() => {
    if (!isGroupActivity) return false;
    if (input.trackCompletion === false) return false;
    if (input.isCompleted) return false;
    if (!hasActivityEnded(input.date, input.hasTime, input.duration ?? undefined)) return false;
    return input.userId === currentUserId;
  }, [isGroupActivity, input.trackCompletion, input.isCompleted, input.date, input.hasTime, input.duration, input.userId, currentUserId]);

  // ── Participation state (matching dooooApp lines 390-408) ──

  const participationStatus = useMemo((): ItemMenuContext['participationStatus'] => {
    if (!isGroupActivity) return 'NONE';
    return (input.participantInstanceStatus as ItemMenuContext['participationStatus']) || 'NONE';
  }, [isGroupActivity, input.participantInstanceStatus]);

  const isParticipatingAll = useMemo(() => {
    if (!input.participants || !currentUserId) return false;
    const userP = input.participants.find(p => p.userId === currentUserId);
    return userP?.status === 'CONFIRMED';
  }, [input.participants, currentUserId]);

  const isParticipationCompleted = participationStatus === 'COMPLETED';

  // ── Timing (matching dooooApp lines 465-472) ──

  const taskStarted = isTaskStarted(input.date, input.hasTime);
  const activityCanComplete = canCompleteActivity(input.date, input.hasTime, input.dateType);
  const isParentCompleted = !!input.parentTaskIsCompleted;

  // ── Build context + items ──

  const menuContext: ItemMenuContext = {
    isEvent,
    isGroupActivity,
    canEdit,
    canDelete,
    canComplete,
    isCompleted: input.isCompleted,
    isOrganizer,
    taskStarted,
    activityCanComplete,
    trackCompletion: input.trackCompletion !== false,
    isRecurring: input.isRecurring,
    isParticipatingAll,
    isParticipationCompleted,
    isParentCompleted,
    participationStatus,
    canManuallyComplete,
  };

  const menuItems = useMemo(() => {
    const date = input.occurrenceDateKey;
    return buildItemMenuItems(menuContext, {
      onEdit: callbacks.onEdit,
      onComplete: callbacks.onToggleComplete,
      onParticipantComplete: (complete) =>
        completeMutation.mutateAsync({ isCompleted: complete, date }),
      onDelete: callbacks.onDelete,
      onInvite: callbacks.onInvite,
      onManualComplete: () =>
        manualCompleteMutation.mutateAsync({ isCompleted: true, date }),
      onParticipate: (scope) =>
        participateMutation.mutateAsync({ participationType: scope as 'single' | 'next' | 'all', date }),
      onDecline: () => declineMutation.mutateAsync(),
      onNotGoing: () => notGoingMutation.mutateAsync({ date }),
      onJoinAnyway: () =>
        participateMutation.mutateAsync({ participationType: 'single', date }),
      onLeave: (scope) =>
        leaveMutation.mutateAsync({ leaveType: scope as 'single' | 'all', date }),
    }, t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuContext, callbacks.onEdit, callbacks.onToggleComplete, callbacks.onDelete, callbacks.onInvite, input.occurrenceDateKey, t]);

  return menuItems;
}
