/**
 * useRecurringDelete — shared delete logic for recurring task/event occurrences.
 *
 * Handles scope selection (this / future / all):
 * - this: delete instance by date
 * - future: truncate repeat endCondition to the day before the occurrence
 * - all: delete the parent task/event entirely
 */

import { useState, useCallback, useMemo } from 'react';
import { useItemMutations } from './useItemMutations';

interface UseRecurringDeleteOptions {
  itemId: string;
  itemType: 'TASK' | 'EVENT';
  isRecurring: boolean;
  /** YYYY-MM-DD of the occurrence being acted on */
  occurrenceDateKey: string;
  /** Parent task/event repeat config (needed for "future" truncation) */
  repeat?: unknown;
  /** Called after successful delete */
  onSuccess?: () => void;
}

export function useRecurringDelete({
  itemId,
  itemType,
  isRecurring,
  occurrenceDateKey,
  repeat,
  onSuccess,
}: UseRecurringDeleteOptions) {
  const {
    deleteTaskMutation,
    deleteEventMutation,
    deleteTaskInstanceMutation,
    deleteEventInstanceMutation,
    updateTaskMutation,
    updateEventMutation,
  } = useItemMutations();

  // 'delete' = scope modal for recurring, 'confirm' = simple confirm for non-recurring
  const [deleteMode, setDeleteMode] = useState<'confirm' | 'scope' | null>(null);

  const handleDeleteClick = useCallback(() => {
    if (isRecurring) {
      setDeleteMode('scope');
    } else {
      setDeleteMode('confirm');
    }
  }, [isRecurring]);

  const closeDelete = useCallback(() => setDeleteMode(null), []);

  const previousDayKey = useCallback(() => {
    const d = new Date(occurrenceDateKey + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [occurrenceDateKey]);

  const deleteAll = useCallback(async () => {
    if (itemType === 'EVENT') {
      await deleteEventMutation.mutateAsync(itemId);
    } else {
      await deleteTaskMutation.mutateAsync(itemId);
    }
    setDeleteMode(null);
    onSuccess?.();
  }, [itemId, itemType, deleteTaskMutation, deleteEventMutation, onSuccess]);

  const deleteThis = useCallback(async () => {
    if (itemType === 'EVENT') {
      await deleteEventInstanceMutation.mutateAsync({ eventId: itemId, date: occurrenceDateKey });
    } else {
      await deleteTaskInstanceMutation.mutateAsync({ taskId: itemId, date: occurrenceDateKey });
    }
    setDeleteMode(null);
    onSuccess?.();
  }, [itemId, itemType, occurrenceDateKey, deleteTaskInstanceMutation, deleteEventInstanceMutation, onSuccess]);

  const deleteFuture = useCallback(async () => {
    const truncated = {
      ...(typeof repeat === 'object' && repeat !== null ? repeat : {}),
      endCondition: { type: 'date', endDate: previousDayKey() },
    };
    if (itemType === 'EVENT') {
      await updateEventMutation.mutateAsync({ id: itemId, data: { repeat: truncated as any } });
    } else {
      await updateTaskMutation.mutateAsync({ id: itemId, data: { repeat: truncated as any } });
    }
    setDeleteMode(null);
    onSuccess?.();
  }, [itemId, itemType, repeat, previousDayKey, updateTaskMutation, updateEventMutation, onSuccess]);

  const isPending = useMemo(() =>
    deleteTaskMutation.isPending ||
    deleteEventMutation.isPending ||
    deleteTaskInstanceMutation.isPending ||
    deleteEventInstanceMutation.isPending ||
    updateTaskMutation.isPending ||
    updateEventMutation.isPending,
  [deleteTaskMutation, deleteEventMutation, deleteTaskInstanceMutation, deleteEventInstanceMutation, updateTaskMutation, updateEventMutation]);

  return {
    deleteMode,
    handleDeleteClick,
    closeDelete,
    deleteAll,
    deleteThis,
    deleteFuture,
    isPending,
  };
}
