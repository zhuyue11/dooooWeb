import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTask, getEvent } from '@/lib/api';
import type { Task, Event as ApiEvent } from '@/types/api';

/**
 * Fetches a task or event from the backend and derives participant-aware
 * display state. Shared by ItemSidePanel and ItemViewPage.
 *
 * For group activities (isForAllMembers), "checked" means the current user's
 * participant instance is completed — NOT that the organizer ended the activity.
 * The organizer ending sets parentTaskIsCompleted (= task.isCompleted).
 */
export function useItemData(
  itemId: string,
  itemType: 'TASK' | 'EVENT',
  currentUserId: string | undefined,
) {
  const { data: rawItem, isLoading, isError } = useQuery<Task | ApiEvent>({
    queryKey: [itemType === 'EVENT' ? 'event' : 'task', itemId],
    queryFn: () => itemType === 'EVENT' ? getEvent(itemId) as Promise<Task | ApiEvent> : getTask(itemId),
  });

  const isTask = itemType === 'TASK';
  const task = isTask ? rawItem as Task | undefined : undefined;
  const event = !isTask ? rawItem as ApiEvent | undefined : undefined;

  const isForAllMembers = task?.isForAllMembers;
  const trackCompletion = task?.trackCompletion;

  // Participant status — find current user in participantInstances or participants.
  // The raw API has status: INVITED|CONFIRMED|DECLINED|LEFT + separate isCompleted boolean.
  // We normalize to a single string including 'COMPLETED'.
  const participantInstanceStatus = useMemo((): string | undefined => {
    if (!isForAllMembers || !currentUserId) return undefined;
    const pi = task?.participantInstances?.find(p => p.participantUserId === currentUserId);
    if (pi) return pi.isCompleted ? 'COMPLETED' : pi.status;
    const p = task?.participants?.find(p => p.userId === currentUserId);
    return p?.status;
  }, [isForAllMembers, currentUserId, task?.participantInstances, task?.participants]);

  // For group activities, parentTaskIsCompleted = organizer ended the activity
  const parentTaskIsCompleted = isForAllMembers ? task?.isCompleted : undefined;

  // isChecked: whether the task is "done" from the current user's perspective
  const isChecked = isForAllMembers
    ? participantInstanceStatus === 'COMPLETED'
    : (task?.isCompleted ?? false);

  // shouldShowToggle: whether the completion toggle should be visible
  const shouldShowToggle = (() => {
    if (!isTask) return false;
    if (!task?.groupId) return true;
    if (isForAllMembers) {
      if (trackCompletion === false) return false;
      if (parentTaskIsCompleted) return false;
      return participantInstanceStatus === 'CONFIRMED' || participantInstanceStatus === 'COMPLETED';
    }
    if (task.assigneeId) return currentUserId === task.assigneeId;
    return currentUserId === task.userId;
  })();

  return {
    rawItem,
    task,
    event,
    isLoading,
    isError,
    // Derived display state
    isForAllMembers,
    trackCompletion,
    participantInstanceStatus,
    parentTaskIsCompleted,
    isChecked,
    creatorName: task?.user?.name,
    assigneeName: task?.assignee?.name,
    assigneeId: task?.assigneeId,
    shouldShowToggle,
  };
}
