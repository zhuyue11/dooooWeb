import { useCallback, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { toggleTask } from '@/lib/api';
import { usePlanReview } from '@/lib/contexts/plan-review-context';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useItemData } from '@/hooks/useItemData';
import { useCategories } from '@/hooks/useCategories';
import { Icon } from '@/components/ui/Icon';
import { hasActivityEnded } from '@/utils/date';
import { ItemDetailCard } from '@/components/calendar/ItemDetailCard';
import { getCategoryName, getCategoryColor, translateCategoryName } from '@/utils/category';
import type { Event as ApiEvent } from '@/types/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { CollapsibleDescription } from '@/components/calendar/CollapsibleDescription';
import { AssigneeDisplay } from '@/components/groups/AssigneeDisplay';
import { NotesSection } from '@/components/calendar/NotesSection';
import { useNotes } from '@/hooks/useNotes';
import { ItemActionsMenu } from '@/components/calendar/ItemActionsMenu';
import { useItemMenu } from '@/hooks/useItemMenu';
import { ParticipantsList } from '@/components/groups/ParticipantsList';
import { computeParticipantStats } from '@/utils/participantStats';
import { ParticipationBanner } from '@/components/groups/ParticipationBanner';
import { InviteParticipantsModal } from '@/components/groups/InviteParticipantsModal';
import { useParticipationMutations } from '@/hooks/useParticipationMutations';

// ── Main component ──

export function ItemViewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'task';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: categories } = useCategories();
  const { deleteTaskMutation, deleteEventMutation } = useItemMutations();
  const { manualCompleteMutation } = useParticipationMutations(id ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch item + derive participant-aware display state
  const itemType = type === 'event' ? 'EVENT' as const : 'TASK' as const;
  const {
    rawItem: item, task: taskItem, event: eventItem, isLoading, isError,
    isForAllMembers, trackCompletion, participantInstanceStatus,
    parentTaskIsCompleted, isChecked: isCompleted, creatorName, assigneeId: taskAssigneeId,
    shouldShowToggle,
  } = useItemData(id ?? '', itemType, user?.id);

  // Notes hook
  const noteItemType = type === 'event' ? 'EVENT' as const : 'TASK' as const;
  const notesHook = useNotes(id, noteItemType);


  const handleBack = useCallback(() => navigate(-1), [navigate]);
  const handleEdit = useCallback(() => {
    navigate(`/items/${id}/edit?type=${type}`);
  }, [navigate, id, type]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (type === 'event') {
      await deleteEventMutation.mutateAsync(id);
    } else {
      await deleteTaskMutation.mutateAsync(id);
    }
    navigate(-1);
  }, [id, type, deleteTaskMutation, deleteEventMutation, navigate]);

  const { showPlanReview } = usePlanReview();
  const handleToggle = useCallback(async () => {
    if (!id || type === 'event') return;
    const { planExecutionCompleted } = await toggleTask(id);
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
    if (planExecutionCompleted) showPlanReview(planExecutionCompleted);
  }, [id, type, queryClient, showPlanReview]);

  // Build 3-dots menu items — must be called before early returns (hooks rules)
  const menuItems = useItemMenu({
    itemType,
    userId: taskItem?.userId,
    isCompleted,
    groupId: taskItem?.groupId,
    isForAllMembers,
    trackCompletion,
    isRecurring: !!taskItem?.repeat,
    parentTaskIsCompleted,
    participantInstanceStatus,
    date: item?.date,
    hasTime: item?.hasTime ?? false,
    dateType: taskItem?.dateType as 'SCHEDULED' | 'DUE' | undefined,
    duration: item?.duration,
    assigneeId: taskAssigneeId,
    participants: taskItem?.participants as any,
    taskId: id ?? '',
    occurrenceDateKey: item?.date?.slice(0, 10) ?? '',
  }, {
    onEdit: handleEdit,
    onDelete: () => setShowDeleteConfirm(true),
    onToggleComplete: handleToggle,
    onInvite: isForAllMembers && taskItem?.groupId ? () => setShowInviteModal(true) : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-(--el-view-detail-label)">
        {t('common.loading')}
      </div>
    );
  }

  if (!item || isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <span className="text-sm text-(--el-view-detail-label)">Item not found</span>
        <button onClick={handleBack} className="text-sm font-medium text-(--el-modal-icon-selected) hover:underline">
          {t('common.back')}
        </button>
      </div>
    );
  }

  const isTask = type === 'task';
  const title = item.title;
  const description = item.description;
  const dateStr = item.date;

  const priority = isTask ? taskItem?.priority : eventItem?.priority;
  const categoryId = isTask ? taskItem?.categoryId : undefined;
  const rawCategoryName = categoryId ? getCategoryName(categoryId, categories) : undefined;
  const categoryName = rawCategoryName ? translateCategoryName(rawCategoryName, t) : undefined;
  const categoryColor = categoryId ? getCategoryColor(categoryId, categories) : undefined;
  const planId = isTask ? taskItem?.planId : undefined;
  const planName = isTask ? taskItem?.plan?.name : undefined;
  const createdAt = item.createdAt;

  // Permissions (matching dooooApp's canUserEditTask / canUserDeleteTask)
  const itemUserId = isTask ? taskItem?.userId : (eventItem as ApiEvent & { userId?: string })?.userId;
  const groupId = isTask ? taskItem?.groupId : undefined;
  const isItemOwner = itemUserId === user?.id;
  const isGroupItem = !!groupId;

  // (A5) Activity ended indicator
  const activityEnded = isGroupItem && !!isForAllMembers && !!parentTaskIsCompleted && !isCompleted;

  const isHighPriority = priority === 'high' || priority === 'HIGH' || priority === 'urgent' || priority === 'URGENT';



  return (
    <div className="animate-page-enter">
      {/* Back row */}
      <button onClick={handleBack} className="mb-6 flex items-center gap-2 text-[13px] font-medium text-(--el-view-detail-label) hover:text-(--el-view-title)">
        <Icon name="arrow_back" size={20} />
        {t('common.back')}
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        {/* Left */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* Title row */}
          <div className="flex items-center gap-3">
            {shouldShowToggle && (
              <button onClick={handleToggle} className="shrink-0">
                {isCompleted ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-(--el-btn-primary-bg)">
                    <Icon name="check" size={16} color="var(--el-btn-primary-text)" weight={700} />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-(--el-btn-primary-bg)" />
                )}
              </button>
            )}
            {!isTask && <Icon name="calendar_today" size={22} color="#5b21b6" />}
            <h1 className={`text-[22px] font-bold ${isCompleted ? 'text-(--el-view-detail-label) line-through' : 'text-(--el-view-title)'}`}>
              {title}
            </h1>
          </div>

          {/* Meta row: pills + date summary */}
          <div className="flex flex-wrap items-center gap-2">
            {planId && (
              <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--el-modal-icon-selected) 12%, transparent)', color: 'var(--el-modal-icon-selected)' }}>
                <Icon name="stars" size={12} color="var(--el-modal-icon-selected)" />
                AI Planned
              </span>
            )}
            {categoryName && (
              <span
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: categoryColor?.bg, color: categoryColor?.text }}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor?.text }} />
                {categoryName}
              </span>
            )}
            {priority && (
              <span
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: isHighPriority ? 'var(--el-panel-priority-high-bg)' : 'var(--el-panel-priority-normal-bg)',
                  color: isHighPriority ? 'var(--el-panel-priority-high-text)' : 'var(--el-panel-priority-normal-text)',
                }}
              >
                <Icon name="flag" size={12} color={isHighPriority ? 'var(--el-panel-priority-high-text)' : 'var(--el-panel-priority-normal-text)'} />
                {t(`tasks.priorities.${priority.toLowerCase()}`)}
              </span>
            )}
            {dateStr && (
              <span className="text-[13px] text-(--el-view-detail-label)">
                {new Date(dateStr).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions menu */}
        <div className="flex shrink-0 items-center gap-2">
          {menuItems.length > 0 && (
            <ItemActionsMenu items={menuItems} />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mb-6 border-t border-(--el-view-edit-border)" />

      {/* Content: two-column */}
      <div className="flex gap-8">
        {/* Left: article */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {description && (
            <CollapsibleDescription content={description} />
          )}
          {!description && (
            <p className="text-sm text-(--el-view-detail-label) italic">No description</p>
          )}

          {/* Notes */}
          <NotesSection
            notes={notesHook.notes}
            total={notesHook.total}
            loading={notesHook.loading}
            currentUserId={user?.id}
            onAddNote={notesHook.addNote}
            onUpdateNote={notesHook.updateNote}
            onDeleteNote={notesHook.deleteNote}
            isAdding={notesHook.isAdding}
            isGroupTask={isGroupItem}
          />
        </div>

        {/* Right: info sidebar */}
        <div className="flex w-[300px] shrink-0 flex-col gap-4">
          {/* Info card */}
          <ItemDetailCard
            date={dateStr || null}
            hasTime={item.hasTime ?? false}
            duration={item.duration}
            endDate={eventItem?.endDate}
            dateType={taskItem?.dateType as 'SCHEDULED' | 'DUE' | undefined}
            timeOfDay={taskItem?.timeOfDay}
            timeZone={item.timeZone}
            repeat={item.repeat}
            firstReminderMinutes={item.firstReminderMinutes}
            secondReminderMinutes={item.secondReminderMinutes}
            location={item.location}
            guests={eventItem?.guests}
            meetingLink={eventItem?.meetingLink}
            createdAt={createdAt}
            isCompleted={isCompleted}
            completedAt={taskItem?.completedAt}
            activityEnded={activityEnded}
            organizerName={isForAllMembers && creatorName ? creatorName : null}
            isForAllMembers={isForAllMembers}
            priority={priority}
            borderColor="--el-view-edit-border"
            separatorColor="--el-view-edit-border"
            labelColor="--el-view-detail-label"
            valueColor="--el-view-title"
            iconSize={16}
            textClass="text-xs"
          />

          {/* Plan card */}
          {planId && planName && (
            <div
              className="rounded-(--radius-card) p-(--spacing-card)"
              style={{ backgroundColor: 'color-mix(in srgb, var(--el-modal-icon-selected) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--el-modal-icon-selected) 19%, transparent)' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon name="stars" size={16} color="var(--el-modal-icon-selected)" />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--el-modal-icon-selected)' }}>
                  Part of a Plan
                </span>
              </div>
              <p className="text-sm font-medium text-(--el-view-title)">{planName}</p>
            </div>
          )}

          {/* (B7) Assignee display for group tasks */}
          {isGroupItem && !isForAllMembers && taskItem?.assignee?.name && (
            <AssigneeDisplay
              assigneeName={taskItem.assignee.name}
              assigneeId={taskItem.assigneeId}
              currentUserId={user?.id}
            />
          )}

          {/* (B1) Participation banner for group activities — uses local status */}
          {isGroupItem && isForAllMembers && id && !isCompleted && (
            <ParticipationBanner
              taskId={id}
              status={(taskItem as any)?.participantInstanceStatus || 'NONE'}
              isRecurring={!!taskItem?.repeat}
              date={taskItem?.date}
              isOrganizer={isItemOwner}
              onEndActivity={() => manualCompleteMutation.mutateAsync({ isCompleted: true, date: taskItem?.date })}
              canManuallyComplete={
                isItemOwner &&
                taskItem?.trackCompletion !== false &&
                !parentTaskIsCompleted &&
                hasActivityEnded(dateStr, item.hasTime ?? false, taskItem?.duration)
              }
              endActivityLoading={manualCompleteMutation.isPending}
            />
          )}

          {/* (B2) Participants list for group activities — computed locally */}
          {isGroupItem && isForAllMembers && (() => {
            const stats = computeParticipantStats(
              taskItem?.participantInstances as any,
              taskItem?.participants as any,
            );
            if (!stats) return null;
            return (
              <div className="my-2">
                <ParticipantsList
                  participants={stats.participants}
                  invitedParticipants={stats.invitedParticipants}
                  notGoingParticipants={stats.notGoingParticipants}
                  totalParticipants={stats.totalParticipants}
                  completedCount={stats.completedCount}
                  currentUserId={user?.id}
                  organizerId={taskItem?.userId ?? ''}
                  trackCompletion={taskItem?.trackCompletion}
                />
              </div>
            );
          })()}
        </div>
      </div>


      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--el-dialog-overlay)" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm rounded-(--radius-modal) bg-(--el-editor-card-bg) p-(--spacing-card) shadow-(--shadow-modal)" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-(--el-view-title)">{t('itemView.confirmDelete')}</h3>
            <p className="mt-2 text-sm text-(--el-view-detail-label)">{t('itemView.deleteDescription')}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-(--radius-btn) border border-(--el-view-edit-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-view-title) hover:bg-(--el-popover-item-hover)"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteTaskMutation.isPending || deleteEventMutation.isPending}
                className="rounded-(--radius-btn) bg-(--el-dialog-confirm-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-semibold text-(--el-dialog-confirm-text) hover:opacity-90 disabled:opacity-50"
              >
                {(deleteTaskMutation.isPending || deleteEventMutation.isPending) ? t('common.deleting') : t('itemView.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite participants modal */}
      {isForAllMembers && groupId && (
        <InviteParticipantsModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          groupId={groupId}
          taskId={id!}
          taskDate={dateStr ?? undefined}
          existingUserIds={(() => {
            const stats = computeParticipantStats(
              taskItem?.participantInstances as any,
              taskItem?.participants as any,
            );
            if (!stats) return [];
            return [
              ...stats.participants.map(p => p.id),
              ...(stats.invitedParticipants?.map(p => p.id) ?? []),
              ...(stats.notGoingParticipants?.map(p => p.id) ?? []),
            ];
          })()}
        />
      )}
    </div>
  );
}
