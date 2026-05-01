/**
 * useReschedule — shared reschedule logic for ItemSidePanel and ItemViewPage.
 *
 * Handles both recurring (convert instance to standalone task/event) and
 * non-recurring (direct update) cases.
 */

import { useCallback } from 'react';
import { useItemMutations } from './useItemMutations';
import type { RescheduleResult } from '@/components/calendar/RescheduleModal';

interface UseRescheduleOptions {
  itemId: string;
  itemType: 'TASK' | 'EVENT';
  isRecurring: boolean;
  /** Title to use for the converted standalone item */
  title: string;
  /** Occurrence date key (YYYY-MM-DD) for the instance being rescheduled */
  occurrenceDateKey: string;
  /** Called after successful reschedule */
  onSuccess?: () => void;
}

export function useReschedule({
  itemId,
  itemType,
  isRecurring,
  title,
  occurrenceDateKey,
  onSuccess,
}: UseRescheduleOptions) {
  const {
    updateTaskMutation,
    updateEventMutation,
    convertTaskInstanceMutation,
    convertEventInstanceMutation,
  } = useItemMutations();

  const isPending =
    updateTaskMutation.isPending ||
    updateEventMutation.isPending ||
    convertTaskInstanceMutation.isPending ||
    convertEventInstanceMutation.isPending;

  const reschedule = useCallback(async (result: RescheduleResult) => {
    const isEvent = itemType === 'EVENT';
    try {
      if (isRecurring) {
        // Convert this occurrence to a new standalone task/event
        // (creates new item with new date + marks original instance as REMOVED)
        if (isEvent) {
          await convertEventInstanceMutation.mutateAsync({
            eventId: itemId,
            instanceId: null,
            data: {
              title,
              date: result.date,
              hasTime: result.hasTime,
              timeZone: result.timeZone,
              ...(result.endDate !== undefined ? { endDate: result.endDate } : {}),
              originalInstanceDate: `${occurrenceDateKey}T12:00:00.000Z`,
            },
          });
        } else {
          await convertTaskInstanceMutation.mutateAsync({
            taskId: itemId,
            instanceId: null,
            data: {
              title,
              date: result.date,
              hasTime: result.hasTime,
              timeOfDay: result.timeOfDay,
              timeZone: result.timeZone,
              dateType: 'SCHEDULED',
              originalInstanceDate: `${occurrenceDateKey}T12:00:00.000Z`,
            },
          });
        }
      } else {
        // Non-recurring — update the task/event directly
        if (isEvent) {
          await updateEventMutation.mutateAsync({
            id: itemId,
            data: {
              date: result.date,
              hasTime: result.hasTime,
              timeZone: result.timeZone,
              ...(result.endDate !== undefined ? { endDate: result.endDate } : {}),
            },
          });
        } else {
          await updateTaskMutation.mutateAsync({
            id: itemId,
            data: {
              date: result.date,
              hasTime: result.hasTime,
              timeOfDay: result.timeOfDay,
              timeZone: result.timeZone,
              dateType: 'SCHEDULED',
            },
          });
        }
      }
      onSuccess?.();
    } catch (error) {
      console.error('Reschedule failed:', error);
    }
  }, [itemId, itemType, isRecurring, title, occurrenceDateKey, onSuccess, updateTaskMutation, updateEventMutation, convertTaskInstanceMutation, convertEventInstanceMutation]);

  return { reschedule, isPending };
}
