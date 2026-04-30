import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { isTaskTimeInPast, hasActivityEnded, toISODate } from '@/utils/date';
import { ItemDetailCard } from './ItemDetailCard';
import { getCategoryName, getCategoryColor, translateCategoryName } from '@/utils/category';
import { getParentIdFromString, getOccurrenceDateFromId } from '@/utils/calendarItemId';
import { RecurringScopeModal } from './RecurringScopeModal';
import { ItemActionsMenu } from './ItemActionsMenu';
import { NotesSection } from './NotesSection';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/lib/contexts/auth-context';
import { useItemMenu } from '@/hooks/useItemMenu';
import { AssigneeDisplay } from '@/components/groups/AssigneeDisplay';
import { ParticipantsList } from '@/components/groups/ParticipantsList';
import { computeParticipantStats } from '@/utils/participantStats';
import { ParticipationBanner } from '@/components/groups/ParticipationBanner';
import { EndActivityConfirmDialog } from '@/components/groups/EndActivityConfirmDialog';
import { InviteParticipantsModal } from '@/components/groups/InviteParticipantsModal';
import { useParticipationMutations } from '@/hooks/useParticipationMutations';
import { useItemData } from '@/hooks/useItemData';
import { toggleTask } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { CollapsibleDescription } from './CollapsibleDescription';

interface ItemSidePanelProps {
  itemId: string;
  itemType: 'TASK' | 'EVENT';
  currentUserId?: string;
  onClose: () => void;
  onToggle?: () => void;
  onMutate?: () => void;
  groupId?: string;
}

// ── Priority pill ──

function PriorityPill({ priority }: { priority: string }) {
  const { t } = useTranslation();
  const p = priority.toLowerCase();
  const isHigh = p === 'high' || p === 'urgent';
  const bg = isHigh ? 'var(--el-panel-priority-high-bg)' : 'var(--el-panel-priority-normal-bg)';
  const text = isHigh ? 'var(--el-panel-priority-high-text)' : 'var(--el-panel-priority-normal-text)';
  const label = t(`tasks.priorities.${p}`);
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      <Icon name="flag" size={12} color={text} />
      {label}
    </span>
  );
}

// ── Category pill ──

function CategoryPill({ categoryId, categories }: { categoryId: string; categories?: Array<{ id: string; name: string; color?: string }> }) {
  const { t } = useTranslation();
  const rawName = getCategoryName(categoryId, categories);
  const name = rawName ? translateCategoryName(rawName, t) : undefined;
  const colors = getCategoryColor(categoryId, categories);
  if (!name) return null;
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colors.text }} />
      {name}
    </span>
  );
}

// ── Main component ──

export function ItemSidePanel({ itemId, itemType, currentUserId, onClose, onToggle, onMutate, groupId }: ItemSidePanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories(groupId);
  const {
    deleteTaskMutation,
    deleteEventMutation,
    deleteTaskInstanceMutation,
    deleteEventInstanceMutation,
    updateTaskMutation,
    updateEventMutation,
  } = useItemMutations();
  const { user } = useAuth();

  // Resolve IDs from the CalendarItem id string
  const parentId = getParentIdFromString(itemId, itemType);
  const idOccurrenceDate = getOccurrenceDateFromId(itemId, itemType);
  const typeParam = itemType.toLowerCase();

  // Fetch live data from backend + derive participant-aware display state
  const {
    rawItem, task, event, isLoading,
    isForAllMembers, trackCompletion, participantInstanceStatus,
    parentTaskIsCompleted, isChecked, creatorName, assigneeName, assigneeId,
    shouldShowToggle,
  } = useItemData(parentId, itemType, currentUserId);

  const { manualCompleteMutation } = useParticipationMutations(parentId);
  const [showEndActivityConfirm, setShowEndActivityConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scopeModalMode, setScopeModalMode] = useState<'edit' | 'delete' | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // ── Derive fields from raw API response ──

  const isTask = itemType === 'TASK';
  const date = task?.date ?? event?.date ?? '';
  const occurrenceDateKey = idOccurrenceDate ?? (date ? toISODate(new Date(date)) : '');
  const hasTime = !!(task?.hasTime ?? event?.hasTime);
  const duration = task?.duration ?? event?.duration ?? undefined;
  const repeat = task?.repeat ?? event?.repeat;
  const recurring = !!repeat;
  const isInstance = idOccurrenceDate !== null;
  const isGroupTask = !!(task?.groupId ?? event?.groupId);

  // Notes — resolve the correct itemType for the unified Note model
  const noteItemType = (() => {
    if (itemType === 'EVENT') return isInstance ? 'EVENT_INSTANCE' as const : 'EVENT' as const;
    return isInstance ? 'TASK_INSTANCE' as const : 'TASK' as const;
  })();
  const notesHook = useNotes(parentId, noteItemType);

  const handleExpand = useCallback(() => {
    onClose();
    navigate(`/items/${parentId}?type=${typeParam}`);
  }, [navigate, parentId, typeParam, onClose]);

  const navigateToEditor = useCallback(
    (scope?: 'this' | 'future' | 'all') => {
      onClose();
      const qs = new URLSearchParams({ type: typeParam });
      if (scope) {
        qs.set('scope', scope);
        if (scope !== 'all') qs.set('occurrenceDate', occurrenceDateKey);
      }
      navigate(`/items/${parentId}/edit?${qs.toString()}`);
    },
    [navigate, parentId, typeParam, occurrenceDateKey, onClose],
  );

  const handleEdit = useCallback(() => {
    if (recurring) {
      setScopeModalMode('edit');
      return;
    }
    navigateToEditor();
  }, [recurring, navigateToEditor]);

  // Compute the previous-day ISO date string used by "this and future" delete
  const previousDayKey = useCallback(() => {
    const d = new Date(occurrenceDateKey + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [occurrenceDateKey]);

  const handleDelete = useCallback(async () => {
    if (itemType === 'EVENT') {
      await deleteEventMutation.mutateAsync(parentId);
    } else {
      await deleteTaskMutation.mutateAsync(parentId);
    }
    onMutate?.();
    onClose();
  }, [deleteTaskMutation, deleteEventMutation, parentId, itemType, onClose, onMutate]);

  const handleScopeDeleteThis = useCallback(async () => {
    if (itemType === 'EVENT') {
      await deleteEventInstanceMutation.mutateAsync({ eventId: parentId, date: occurrenceDateKey });
    } else {
      await deleteTaskInstanceMutation.mutateAsync({ taskId: parentId, date: occurrenceDateKey });
    }
    setScopeModalMode(null);
    onMutate?.();
    onClose();
  }, [deleteEventInstanceMutation, deleteTaskInstanceMutation, parentId, occurrenceDateKey, itemType, onClose, onMutate]);

  const handleScopeDeleteFuture = useCallback(async () => {
    const truncated = {
      ...(typeof repeat === 'object' && repeat !== null ? repeat : {}),
      endCondition: { type: 'date', endDate: previousDayKey() },
    };
    if (itemType === 'EVENT') {
      await updateEventMutation.mutateAsync({ id: parentId, data: { repeat: truncated as any } });
    } else {
      await updateTaskMutation.mutateAsync({ id: parentId, data: { repeat: truncated as any } });
    }
    setScopeModalMode(null);
    onMutate?.();
    onClose();
  }, [updateEventMutation, updateTaskMutation, parentId, repeat, itemType, previousDayKey, onClose, onMutate]);

  const handleScopeDeleteAll = useCallback(async () => {
    if (itemType === 'EVENT') {
      await deleteEventMutation.mutateAsync(parentId);
    } else {
      await deleteTaskMutation.mutateAsync(parentId);
    }
    setScopeModalMode(null);
    onMutate?.();
    onClose();
  }, [deleteEventMutation, deleteTaskMutation, parentId, itemType, onClose, onMutate]);

  const handleDeleteClick = useCallback(() => {
    if (recurring) {
      setScopeModalMode('delete');
      return;
    }
    setShowDeleteConfirm(true);
  }, [recurring]);

  const handleToggle = useCallback(async () => {
    if (itemType === 'EVENT') return;
    await toggleTask(parentId);
    queryClient.invalidateQueries({ queryKey: ['task', parentId] });
    onToggle?.();
  }, [parentId, itemType, queryClient, onToggle]);

  // (B6) Activity can complete — DUE type always, SCHEDULED only after start
  const activityCanComplete = (() => {
    if (!isForAllMembers) return true;
    if (task?.dateType === 'DUE') return true;
    return isTaskTimeInPast(date, hasTime);
  })();
  const showDashedCircle = shouldShowToggle && !!isForAllMembers && !activityCanComplete && !isChecked;

  // (A5) Activity ended indicator
  const activityEnded = isGroupTask && !!isForAllMembers && !!parentTaskIsCompleted && !isChecked;

  // Compute participant stats
  const localParticipantStats = isForAllMembers
    ? computeParticipantStats(task?.participantInstances as any, task?.participants as any)
    : null;

  const title = task?.title ?? event?.title ?? '';
  const description = task?.description ?? event?.description;
  const priority = task?.priority;
  const categoryId = task?.categoryId ?? undefined;
  const itemGroupId = task?.groupId ?? event?.groupId ?? undefined;

  // Build 3-dots menu items via shared hook
  const menuItems = useItemMenu({
    itemType,
    userId: task?.userId,
    isCompleted: isChecked,
    groupId: itemGroupId,
    isForAllMembers,
    trackCompletion,
    isRecurring: recurring,
    parentTaskIsCompleted,
    participantInstanceStatus,
    date,
    hasTime,
    dateType: task?.dateType as 'SCHEDULED' | 'DUE' | undefined,
    duration,
    assigneeId,
    participants: task?.participants as any,
    taskId: parentId,
    occurrenceDateKey,
  }, {
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleComplete: handleToggle,
    onInvite: isForAllMembers && itemGroupId ? () => setShowInviteModal(true) : undefined,
  });

  // Loading state
  if (isLoading || !rawItem) {
    return createPortal(
      <div className="fixed inset-0 z-40 flex justify-end" onClick={handleClose}>
        <div className={`absolute inset-0 bg-black/20 ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} />
        <div
          className={`relative flex h-full w-[420px] max-w-full flex-col items-center justify-center bg-(--el-panel-bg) shadow-[-4px_0_16px_rgba(0,0,0,0.12)] ${isClosing ? 'animate-panel-out' : 'animate-panel-in'}`}
          style={{ borderLeft: '1px solid var(--el-panel-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--el-panel-detail-label) border-t-transparent" />
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" onClick={handleClose}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/20 ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="item-side-panel"
        className={`relative flex h-full w-[420px] max-w-full flex-col bg-(--el-panel-bg) shadow-[-4px_0_16px_rgba(0,0,0,0.12)] ${isClosing ? 'animate-panel-out' : 'animate-panel-in'}`}
        style={{ borderLeft: '1px solid var(--el-panel-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-(--el-panel-header-border) px-6 py-4">
          {/* Left: checkbox + title */}
          <div className="flex min-w-0 items-center gap-3">
            {shouldShowToggle ? (
              <button
                onClick={showDashedCircle ? undefined : handleToggle}
                className="shrink-0"
                title={showDashedCircle ? t('groups.participate.activityNotStarted') : undefined}
              >
                {isChecked ? (
                  <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-(--el-item-checkbox-bg)">
                    <Icon name="check" size={14} color="var(--el-item-checkbox-mark)" weight={700} />
                  </div>
                ) : showDashedCircle ? (
                  <div className="h-[22px] w-[22px] rounded-full border-2 border-dashed border-(--el-item-checkbox-border) opacity-50" />
                ) : (
                  <div className="h-[22px] w-[22px] rounded-full border-2 border-(--el-item-checkbox-border)" />
                )}
              </button>
            ) : !isTask ? (
              <Icon name="calendar_today" size={20} color="var(--el-cal-event-text)" className="shrink-0" />
            ) : null}
            <span className={`truncate text-lg font-semibold ${isChecked ? 'text-(--el-panel-title-completed) line-through' : 'text-(--el-panel-title)'}`}>
              {title}
            </span>
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              data-testid="side-panel-expand"
              onClick={handleExpand}
              className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg)"
              title={t('itemView.expand')}
            >
              <Icon name="open_in_full" size={18} />
            </button>
            {menuItems.length > 0 && (
              <ItemActionsMenu items={menuItems} />
            )}
            <button
              data-testid="side-panel-close"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg)"
              title={t('common.close')}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
          {/* Priority + Category pills */}
          {(priority || categoryId) && (
            <div className="flex flex-wrap items-center gap-2">
              {priority && <PriorityPill priority={priority} />}
              {categoryId && <CategoryPill categoryId={categoryId} categories={categories} />}
            </div>
          )}

          {/* Details card */}
          <ItemDetailCard
            date={date || null}
            hasTime={hasTime}
            duration={duration}
            endDate={event?.endDate}
            dateType={task?.dateType as 'SCHEDULED' | 'DUE' | undefined}
            timeOfDay={task?.timeOfDay}
            timeZone={(task as any)?.timeZone || (event as any)?.timeZone}
            repeat={repeat}
            firstReminderMinutes={task?.firstReminderMinutes ?? event?.firstReminderMinutes}
            secondReminderMinutes={task?.secondReminderMinutes ?? event?.secondReminderMinutes}
            location={task?.location ?? event?.location}
            guests={event?.guests}
            meetingLink={event?.meetingLink}
            createdAt={task?.createdAt ?? event?.createdAt}
            isCompleted={isChecked}
            completedAt={task?.completedAt}
            activityEnded={activityEnded}
            organizerName={isForAllMembers && creatorName ? creatorName : null}
            isForAllMembers={isForAllMembers}
            borderColor="--el-panel-border"
            separatorColor="--el-panel-separator"
            labelColor="--el-panel-detail-label"
            valueColor="--el-panel-detail-value"
          />

          {/* Group activity participation banner */}
          {isGroupTask && isForAllMembers && !isChecked && (
            <ParticipationBanner
              taskId={parentId}
              status={participantInstanceStatus || 'NONE'}
              isRecurring={recurring}
              date={occurrenceDateKey}
              isOrganizer={task?.userId === currentUserId}
              onEndActivity={() => {
                if (localParticipantStats && localParticipantStats.totalParticipants > 0) {
                  setShowEndActivityConfirm(true);
                } else {
                  manualCompleteMutation.mutateAsync({ isCompleted: true, date: occurrenceDateKey });
                }
              }}
              canManuallyComplete={
                task?.userId === currentUserId &&
                trackCompletion !== false &&
                !parentTaskIsCompleted &&
                hasActivityEnded(date, hasTime, duration)
              }
              endActivityLoading={manualCompleteMutation.isPending}
            />
          )}

          {/* Description */}
          {description && (
            <CollapsibleDescription content={description} />
          )}

          {/* Notes */}
          <NotesSection
            notes={notesHook.notes}
            total={notesHook.total}
            loading={notesHook.loading}
            currentUserId={currentUserId || user?.id}
            onAddNote={notesHook.addNote}
            onUpdateNote={notesHook.updateNote}
            onDeleteNote={notesHook.deleteNote}
            isAdding={notesHook.isAdding}
            isGroupTask={isGroupTask}
          />

          {/* Group activity participants list */}
          {isGroupTask && isForAllMembers && localParticipantStats && (
            <div className="mx-4 my-2">
              <ParticipantsList
                participants={localParticipantStats.participants}
                invitedParticipants={localParticipantStats.invitedParticipants}
                notGoingParticipants={localParticipantStats.notGoingParticipants}
                totalParticipants={localParticipantStats.totalParticipants}
                completedCount={localParticipantStats.completedCount}
                currentUserId={currentUserId}
                organizerId={task?.userId ?? ''}
                trackCompletion={trackCompletion}
              />
            </div>
          )}

          {/* Group task assignment info */}
          {isGroupTask && !isForAllMembers && assigneeName && (
            <AssigneeDisplay
              assigneeName={assigneeName}
              assigneeId={assigneeId}
              currentUserId={currentUserId}
            />
          )}

        </div>

        {/* ── Delete confirmation overlay ── */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-(--el-dialog-overlay)">
            <div className="mx-6 w-full max-w-sm rounded-(--radius-modal) bg-(--el-dialog-bg) p-(--spacing-card) shadow-(--shadow-modal)" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-(--el-dialog-title)">{t('itemView.confirmDelete')}</h3>
              <p className="mt-2 text-sm text-(--el-dialog-description)">{t('itemView.deleteDescription')}</p>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-(--radius-btn) border border-(--el-dialog-cancel-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-dialog-cancel-text) hover:opacity-80"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteTaskMutation.isPending}
                  className="rounded-(--radius-btn) bg-(--el-dialog-confirm-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-(--el-dialog-confirm-text) hover:opacity-90 disabled:opacity-50"
                >
                  {(deleteTaskMutation.isPending || deleteEventMutation.isPending) ? t('common.deleting') : t('itemView.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Recurring scope picker (edit/delete this/future/all) ── */}
        <RecurringScopeModal
          open={scopeModalMode !== null}
          mode={scopeModalMode ?? 'edit'}
          pending={
            deleteTaskInstanceMutation.isPending ||
            deleteEventInstanceMutation.isPending ||
            updateTaskMutation.isPending ||
            updateEventMutation.isPending ||
            deleteTaskMutation.isPending ||
            deleteEventMutation.isPending
          }
          onThis={() => {
            if (scopeModalMode === 'edit') {
              setScopeModalMode(null);
              navigateToEditor('this');
            } else {
              handleScopeDeleteThis();
            }
          }}
          onAllFuture={() => {
            if (scopeModalMode === 'edit') {
              setScopeModalMode(null);
              navigateToEditor('future');
            } else {
              handleScopeDeleteFuture();
            }
          }}
          onAll={() => {
            if (scopeModalMode === 'edit') {
              setScopeModalMode(null);
              navigateToEditor('all');
            } else {
              handleScopeDeleteAll();
            }
          }}
          onClose={() => setScopeModalMode(null)}
        />

        {/* Invite participants modal */}
        {isForAllMembers && itemGroupId && (
          <InviteParticipantsModal
            open={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            groupId={itemGroupId}
            taskId={parentId}
            taskDate={occurrenceDateKey}
            existingUserIds={[
              ...(localParticipantStats?.participants.map(p => p.id) ?? []),
              ...(localParticipantStats?.invitedParticipants?.map(p => p.id) ?? []),
              ...(localParticipantStats?.notGoingParticipants?.map(p => p.id) ?? []),
            ]}
          />
        )}

        {/* End Activity confirmation dialog */}
        <EndActivityConfirmDialog
          open={showEndActivityConfirm}
          completionStats={localParticipantStats}
          isLoading={manualCompleteMutation.isPending}
          onConfirm={() => {
            manualCompleteMutation.mutateAsync({ isCompleted: true, date: occurrenceDateKey })
              .then(() => setShowEndActivityConfirm(false));
          }}
          onCancel={() => setShowEndActivityConfirm(false)}
        />
      </div>
    </div>,
    document.body,
  );
}
