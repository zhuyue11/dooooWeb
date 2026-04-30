import { useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTask, getEvent, toggleTask } from '@/lib/api';
import { usePlanReview } from '@/lib/contexts/plan-review-context';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { useDisplay } from '@/lib/contexts/display-context';
import { Icon } from '@/components/ui/Icon';
import { formatFullDate, formatTime, formatReminder, formatDuration, formatCompletionTime, formatRepeatDisplay, isTaskTimeInPast } from '@/utils/date';
import { getCategoryName, getCategoryColor, translateCategoryName } from '@/utils/category';
import type { TimeFormat } from '@/utils/date';
import type { Task, Event as ApiEvent } from '@/types/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { useState } from 'react';
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

// ── Detail row ──

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon name={icon} size={16} color="var(--el-view-detail-label)" />
      <span className="w-20 shrink-0 text-xs text-(--el-view-detail-label)">{label}</span>
      <span className="text-xs font-medium text-(--el-view-title)">{value}</span>
    </div>
  );
}

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
  const { timeFormat } = useDisplay();
  const { deleteTaskMutation, deleteEventMutation } = useItemMutations();
  const { manualCompleteMutation } = useParticipationMutations(id ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Fetch item — cast to shared type to avoid union issues
  const { data: item, isLoading, isError } = useQuery<Task | ApiEvent>({
    queryKey: [type === 'event' ? 'event' : 'task', id],
    queryFn: () => type === 'event' ? getEvent(id!) as Promise<Task | ApiEvent> : getTask(id!),
    enabled: !!id,
    retry: false,
  });

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
  const taskItemForMenu = type === 'task' && item ? (item as Task) : null;
  const eventItemForMenu = type !== 'task' && item ? (item as ApiEvent) : null;
  const menuItems = useItemMenu({
    itemType: type === 'task' ? 'TASK' : 'EVENT',
    userId: type === 'task' ? taskItemForMenu?.userId : (eventItemForMenu as any)?.userId,
    isCompleted: type === 'task' ? (taskItemForMenu?.isCompleted ?? false) : false,
    groupId: taskItemForMenu?.groupId,
    isForAllMembers: taskItemForMenu?.isForAllMembers,
    trackCompletion: taskItemForMenu?.trackCompletion,
    isRecurring: !!taskItemForMenu?.repeat,
    parentTaskIsCompleted: (taskItemForMenu as any)?.parentTaskIsCompleted,
    participantInstanceStatus: (taskItemForMenu as any)?.participantInstanceStatus,
    date: item?.date,
    hasTime: item?.hasTime ?? false,
    dateType: taskItemForMenu?.dateType as 'SCHEDULED' | 'DUE' | undefined,
    duration: item?.duration,
    assigneeId: taskItemForMenu?.assigneeId,
    participants: taskItemForMenu?.participants as any,
    taskId: id ?? '',
    occurrenceDateKey: item?.date?.slice(0, 10) ?? '',
  }, {
    onEdit: handleEdit,
    onDelete: () => setShowDeleteConfirm(true),
    onToggleComplete: handleToggle,
    onInvite: taskItemForMenu?.isForAllMembers && taskItemForMenu?.groupId ? () => setShowInviteModal(true) : undefined,
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

  // Determine fields based on type
  const isTask = type === 'task';
  const taskItem = isTask ? (item as Task) : null;
  const eventItem = !isTask ? (item as ApiEvent) : null;

  const title = item.title;
  const description = item.description;
  const isCompleted = isTask ? (taskItem?.isCompleted ?? false) : false;
  const dateStr = item.date;

  // (A1) Date display with dateType prefix
  const dateType = isTask ? taskItem?.dateType : undefined;
  const datePrefix = dateType === 'DUE' ? `${t('itemView.due')} · ` : '';
  // (A2) Multi-day event range
  const endDate = !isTask ? eventItem?.endDate : undefined;
  const dateDisplay = (() => {
    if (!dateStr) return null;
    const startStr = formatFullDate(new Date(dateStr));
    if (endDate && endDate.slice(0, 10) !== dateStr.slice(0, 10)) {
      const endStr = formatFullDate(new Date(endDate));
      return `${datePrefix}${startStr} — ${endStr}`;
    }
    return `${datePrefix}${startStr}`;
  })();

  // (A3) Time display with end time from duration
  const timeDisplay = (() => {
    if (!item.hasTime || !dateStr) return null;
    const startTime = formatTime(dateStr, timeFormat as TimeFormat);
    if (item.duration) {
      const endMs = new Date(dateStr).getTime() + item.duration * 60000;
      const endTime = formatTime(new Date(endMs).toISOString(), timeFormat as TimeFormat);
      return `${startTime} — ${endTime}`;
    }
    return startTime;
  })();

  const timeOfDayValue = isTask && !item.hasTime && taskItem?.timeOfDay ? taskItem.timeOfDay : null;
  const TIME_OF_DAY_META: Record<string, { icon: string; i18nKey: string }> = {
    MORNING: { icon: 'wb_sunny', i18nKey: 'tasks.timeOfDay.morning' },
    AFTERNOON: { icon: 'wb_cloudy', i18nKey: 'tasks.timeOfDay.afternoon' },
    EVENING: { icon: 'nightlight', i18nKey: 'tasks.timeOfDay.evening' },
  };
  // Timezone display
  const deviceTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  const itemTz = item.timeZone || null;
  const tzDisplay = item.hasTime && itemTz && itemTz !== deviceTz
    ? (() => {
        try {
          const parts = new Intl.DateTimeFormat(i18n.language, { timeZone: itemTz, timeZoneName: 'long' }).formatToParts(new Date());
          return parts.find(p => p.type === 'timeZoneName')?.value || itemTz;
        } catch { return itemTz; }
      })()
    : null;

  // (A9) Duration display — human-friendly translated format
  const durationDisplay = formatDuration(item.duration, t);

  // (A8) Hide reminders for past/completed tasks
  const taskTimePast = isTaskTimeInPast(dateStr, item.hasTime ?? false);
  const showReminders = !isCompleted && !taskTimePast;
  // (A10) Both first and second reminders
  const reminderDisplay = showReminders ? formatReminder(item.firstReminderMinutes) : null;
  const secondReminderDisplay = showReminders ? formatReminder(item.secondReminderMinutes) : null;

  // (A7) Repeat display — translated
  const repeatDisplay = formatRepeatDisplay(item.repeat, t);

  // (A11) Location
  const locationDisplay = item.location || null;

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

  // (A4) Completion timestamp
  const completedAt = isTask ? taskItem?.completedAt : undefined;
  const isForAllMembers = isTask ? taskItem?.isForAllMembers : undefined;
  const completionDisplay = isCompleted ? formatCompletionTime(completedAt, isForAllMembers, t) : null;

  // (A5) Activity ended — check parentTaskIsCompleted
  const parentTaskIsCompleted = isTask ? (taskItem as Task & { parentTaskIsCompleted?: boolean })?.parentTaskIsCompleted : undefined;
  const activityEnded = isGroupItem && isForAllMembers && parentTaskIsCompleted && !isCompleted;

  // (A6) Organizer display
  const creatorName = isTask ? (taskItem as Task & { user?: { name?: string } })?.user?.name : undefined;
  const organizerDisplay = isForAllMembers && creatorName ? creatorName : null;

  // (A12) Guests
  const guestsDisplay = !isTask && eventItem?.guests && eventItem.guests.length > 0 ? eventItem.guests : null;
  // (A13) Meeting link
  const meetingLinkDisplay = !isTask && eventItem?.meetingLink ? eventItem.meetingLink : null;

  const isHighPriority = priority === 'high' || priority === 'HIGH' || priority === 'urgent' || priority === 'URGENT';
  const hasAnyDetail = dateDisplay || timeDisplay || timeOfDayValue || tzDisplay || durationDisplay || reminderDisplay || locationDisplay || repeatDisplay || priority || completionDisplay || activityEnded || organizerDisplay || createdAt;



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
            {isTask && (
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
            {dateDisplay && (
              <span className="text-[13px] text-(--el-view-detail-label)">
                {dateDisplay}
                {timeDisplay && ` · ${timeDisplay}`}
                {!timeDisplay && timeOfDayValue && ` · ${t(TIME_OF_DAY_META[timeOfDayValue].i18nKey)}`}
                {durationDisplay && ` · ${durationDisplay}`}
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
          {hasAnyDetail && (
            <div className="rounded-(--radius-card) border border-(--el-view-edit-border)">
              {dateDisplay && (
                <DetailRow icon="calendar_today" label={t('itemView.date')} value={dateDisplay} />
              )}
              {timeDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="schedule" label={t('itemView.time')} value={timeDisplay} />
                </>
              )}
              {timeOfDayValue && TIME_OF_DAY_META[timeOfDayValue] && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow
                    icon={TIME_OF_DAY_META[timeOfDayValue].icon}
                    label={t('itemView.time')}
                    value={t(TIME_OF_DAY_META[timeOfDayValue].i18nKey)}
                  />
                </>
              )}
              {durationDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="timer" label={t('itemView.duration')} value={durationDisplay} />
                </>
              )}
              {reminderDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="notifications" label={t('itemView.reminder')} value={reminderDisplay} />
                </>
              )}
              {/* (A10) Second reminder */}
              {secondReminderDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="notifications" label={t('itemView.reminder')} value={secondReminderDisplay} />
                </>
              )}
              {/* (A4) Completion timestamp */}
              {completionDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="check_circle" label={t('itemView.completedAt')} value={completionDisplay} />
                </>
              )}
              {/* (A5) Activity ended indicator */}
              {activityEnded && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon name="event_busy" size={16} color="var(--el-dialog-confirm-bg)" />
                    <span className="text-xs font-medium" style={{ color: 'var(--el-dialog-confirm-bg)' }}>
                      {t('itemView.activityEnded')}
                    </span>
                  </div>
                </>
              )}
              {/* (A11) Location — clickable */}
              {locationDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon name="location_on" size={16} color="var(--el-view-detail-label)" />
                    <span className="w-20 shrink-0 text-xs text-(--el-view-detail-label)">{t('itemView.location')}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationDisplay)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs font-medium text-(--el-view-title) hover:underline"
                    >
                      {locationDisplay}
                    </a>
                  </div>
                </>
              )}
              {/* (A12) Guests */}
              {guestsDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Icon name="group" size={16} color="var(--el-view-detail-label)" className="mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs text-(--el-view-detail-label)">{t('itemView.guests')}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {guestsDisplay.map((g) => (
                          <span key={g.email} className="inline-flex items-center rounded-(--radius-btn) bg-(--el-panel-guest-bg) px-(--spacing-btn-x-sm) py-0.5 text-xs font-medium text-(--el-panel-guest-text)">
                            {g.email}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {/* (A13) Meeting link */}
              {meetingLinkDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon name="videocam" size={16} color="var(--el-view-detail-label)" />
                    <span className="w-20 shrink-0 text-xs text-(--el-view-detail-label)">{t('itemView.meetingLink')}</span>
                    <a href={meetingLinkDisplay} target="_blank" rel="noopener noreferrer" className="truncate text-xs font-medium text-(--el-view-title) hover:underline">
                      {meetingLinkDisplay}
                    </a>
                  </div>
                </>
              )}
              {tzDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="public" label={t('itemView.timeZone')} value={tzDisplay} />
                </>
              )}
              {priority && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="flag" label={t('itemView.priority')} value={t(`tasks.priorities.${priority.toLowerCase()}`)} />
                </>
              )}
              {repeatDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="repeat" label={t('itemView.repeat')} value={repeatDisplay} />
                </>
              )}
              {/* (A6) Organizer display */}
              {organizerDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="person" label={t('itemView.organizer')} value={organizerDisplay} />
                </>
              )}
              {createdAt && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow
                    icon="event_available"
                    label={t('itemView.createdAt')}
                    value={new Date(createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                  />
                </>
              )}
            </div>
          )}

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
                isTaskTimeInPast(dateStr, item.hasTime ?? false)
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
