import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { formatFullDate, formatTime, formatReminder, formatDuration, formatCompletionTime, formatRepeatDisplay, isTaskTimeInPast } from '@/utils/date';
import { getCategoryName, getCategoryColor, translateCategoryName } from '@/utils/category';
import { useDisplay } from '@/lib/contexts/display-context';
import { getParentId, getOccurrenceDateKey, isRecurringInstance } from '@/utils/calendarItemId';
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
import { InviteParticipantsModal } from '@/components/groups/InviteParticipantsModal';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { TimeFormat } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { CollapsibleDescription } from './CollapsibleDescription';

interface ItemSidePanelProps {
  item: CalendarItem;
  currentUserId?: string;
  onClose: () => void;
  onToggle?: (item: CalendarItem) => void;
  groupId?: string;
}

// ── Detail row ──

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon name={icon} size={18} color="var(--el-panel-detail-label)" />
      <span className="w-20 shrink-0 text-[13px] text-(--el-panel-detail-label)">{label}</span>
      <span className="text-[13px] font-medium text-(--el-panel-detail-value)">{value}</span>
    </div>
  );
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

export function ItemSidePanel({ item, currentUserId, onClose, onToggle, groupId }: ItemSidePanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: categories } = useCategories(groupId);
  const { timeFormat } = useDisplay();
  const {
    deleteTaskMutation,
    deleteEventMutation,
    deleteTaskInstanceMutation,
    deleteEventInstanceMutation,
    updateTaskMutation,
    updateEventMutation,
  } = useItemMutations();
  const { user } = useAuth();
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

  const isGroupTask = !!item.groupId;

  // Resolve the parent task/event id (never the virtual occurrence id) so all
  // routing and mutations target the actual backend record.
  const parentId = getParentId(item);
  const occurrenceDateKey = getOccurrenceDateKey(item);
  const recurring = isRecurringInstance(item);
  const typeParam = item.itemType.toLowerCase();

  // Notes — resolve the correct itemType for the unified Note model
  const noteItemType = (() => {
    if (item.itemType === 'EVENT') return item.isInstance ? 'EVENT_INSTANCE' as const : 'EVENT' as const;
    return item.isInstance ? 'TASK_INSTANCE' as const : 'TASK' as const;
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
    // Non-recurring or recurring "all" path: full parent delete
    if (item.itemType === 'EVENT') {
      await deleteEventMutation.mutateAsync(parentId);
    } else {
      await deleteTaskMutation.mutateAsync(parentId);
    }
    onClose();
  }, [deleteTaskMutation, deleteEventMutation, parentId, item.itemType, onClose]);

  const handleScopeDeleteThis = useCallback(async () => {
    if (item.itemType === 'EVENT') {
      await deleteEventInstanceMutation.mutateAsync({ eventId: parentId, date: occurrenceDateKey });
    } else {
      await deleteTaskInstanceMutation.mutateAsync({ taskId: parentId, date: occurrenceDateKey });
    }
    setScopeModalMode(null);
    onClose();
  }, [deleteEventInstanceMutation, deleteTaskInstanceMutation, parentId, occurrenceDateKey, item.itemType, onClose]);

  const handleScopeDeleteFuture = useCallback(async () => {
    const truncated = {
      ...(typeof item.repeat === 'object' && item.repeat !== null ? item.repeat : {}),
      endCondition: { type: 'date', endDate: previousDayKey() },
    };
    if (item.itemType === 'EVENT') {
      await updateEventMutation.mutateAsync({ id: parentId, data: { repeat: truncated as any } });
    } else {
      await updateTaskMutation.mutateAsync({ id: parentId, data: { repeat: truncated as any } });
    }
    setScopeModalMode(null);
    onClose();
  }, [updateEventMutation, updateTaskMutation, parentId, item.repeat, item.itemType, previousDayKey, onClose]);

  const handleScopeDeleteAll = useCallback(async () => {
    if (item.itemType === 'EVENT') {
      await deleteEventMutation.mutateAsync(parentId);
    } else {
      await deleteTaskMutation.mutateAsync(parentId);
    }
    setScopeModalMode(null);
    onClose();
  }, [deleteEventMutation, deleteTaskMutation, parentId, item.itemType, onClose]);

  const handleDeleteClick = useCallback(() => {
    if (recurring) {
      setScopeModalMode('delete');
      return;
    }
    setShowDeleteConfirm(true);
  }, [recurring]);

  const handleToggle = useCallback(() => {
    onToggle?.(item);
  }, [onToggle, item]);

  // Derived display values
  const isTask = item.itemType === 'TASK';
  const isChecked = item.isForAllMembers
    ? item.participantInstanceStatus === 'COMPLETED'
    : item.isCompleted;

  const shouldShowToggle = (() => {
    if (!isTask) return false;
    if (!item.groupId) return true;
    if (item.isForAllMembers) {
      if (item.trackCompletion === false) return false;
      return item.participantInstanceStatus === 'CONFIRMED' || item.participantInstanceStatus === 'COMPLETED';
    }
    if (item.assigneeId) return currentUserId === item.assigneeId;
    return currentUserId === item.userId;
  })();

  // (B6) Activity can complete — DUE type always, SCHEDULED only after start
  const activityCanComplete = (() => {
    if (!item.isForAllMembers) return true;
    if (item.dateType === 'DUE') return true;
    return isTaskTimeInPast(item.date, item.hasTime);
  })();
  // Show dashed circle when participant can't complete yet (future scheduled activity)
  const showDashedCircle = shouldShowToggle && item.isForAllMembers && !activityCanComplete && !isChecked;

  // (A1) Date display with dateType prefix
  const datePrefix = item.dateType === 'DUE' ? `${t('itemView.due')} · ` : '';
  // (A2) Multi-day event range
  const dateDisplay = (() => {
    if (!item.date) return null;
    const startStr = formatFullDate(new Date(item.date));
    if (item.endDate && item.endDate.slice(0, 10) !== item.date.slice(0, 10)) {
      const endStr = formatFullDate(new Date(item.endDate));
      return `${datePrefix}${startStr} — ${endStr}`;
    }
    return `${datePrefix}${startStr}`;
  })();

  // (A3) Time display with end time from duration
  const timeDisplay = (() => {
    if (!item.hasTime || !item.date) return null;
    const startTime = formatTime(item.date, timeFormat as TimeFormat);
    if (item.duration) {
      const endMs = new Date(item.date).getTime() + item.duration * 60000;
      const endTime = formatTime(new Date(endMs).toISOString(), timeFormat as TimeFormat);
      return `${startTime} — ${endTime}`;
    }
    return startTime;
  })();

  const timeOfDayDisplay = !item.hasTime && item.timeOfDay ? item.timeOfDay : null;
  const TIME_OF_DAY_META: Record<string, { icon: string; i18nKey: string }> = {
    MORNING: { icon: 'wb_sunny', i18nKey: 'tasks.timeOfDay.morning' },
    AFTERNOON: { icon: 'wb_cloudy', i18nKey: 'tasks.timeOfDay.afternoon' },
    EVENING: { icon: 'nightlight', i18nKey: 'tasks.timeOfDay.evening' },
  };

  // Timezone display — show abbreviation when task/event tz differs from device tz
  const deviceTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  const itemTz = item.sourceTask?.timeZone || item.sourceEvent?.timeZone || null;
  const tzDisplay = item.hasTime && itemTz && itemTz !== deviceTz
    ? (() => {
        try {
          const parts = new Intl.DateTimeFormat(i18n.language, { timeZone: itemTz, timeZoneName: 'long' }).formatToParts(new Date());
          return parts.find(p => p.type === 'timeZoneName')?.value || itemTz;
        } catch { return itemTz; }
      })()
    : null;

  // (A7) Repeat display — translated
  const repeatDisplay = formatRepeatDisplay(item.repeat, t);

  // (A9) Duration display — human-friendly translated format
  const durationDisplay = formatDuration(item.duration, t);

  // (A8) Hide reminders for past/completed tasks
  const taskTimePast = isTaskTimeInPast(item.date, item.hasTime);
  const showReminders = !isChecked && !taskTimePast;
  const reminderDisplay = showReminders ? formatReminder(item.firstReminderMinutes) : null;
  const secondReminderDisplay = showReminders ? formatReminder(item.secondReminderMinutes) : null;

  const locationDisplay = item.location || null;
  const guestsDisplay = item.guests && item.guests.length > 0 ? item.guests : null;
  const meetingLinkDisplay = item.meetingLink || null;

  // (A4) Completion timestamp
  const completionDisplay = isChecked ? formatCompletionTime(item.completedAt, item.isForAllMembers, t) : null;

  // (A5) Activity ended indicator
  const activityEnded = isGroupTask && item.isForAllMembers && item.parentTaskIsCompleted && !isChecked;

  // (A6) Organizer display
  const organizerDisplay = item.isForAllMembers && item.creatorName ? item.creatorName : null;

  // Compute participant stats locally from item data (matching dooooApp pattern)
  const localParticipantStats = item.isForAllMembers
    ? computeParticipantStats(item.participantInstances, item.participants)
    : null;

  const createdAtRaw = item.sourceTask?.createdAt || item.sourceEvent?.createdAt;
  const hasAnyDetail = dateDisplay || timeDisplay || timeOfDayDisplay || tzDisplay || repeatDisplay || durationDisplay || reminderDisplay || locationDisplay || guestsDisplay || meetingLinkDisplay || completionDisplay || activityEnded || organizerDisplay || createdAtRaw;

  // Build 3-dots menu items via shared hook
  const menuItems = useItemMenu({
    itemType: item.itemType as 'TASK' | 'EVENT',
    userId: item.userId,
    isCompleted: isChecked,
    groupId: item.groupId,
    isForAllMembers: item.isForAllMembers,
    trackCompletion: item.trackCompletion,
    isRecurring: recurring,
    parentTaskIsCompleted: item.parentTaskIsCompleted,
    participantInstanceStatus: item.participantInstanceStatus,
    date: item.date,
    hasTime: item.hasTime,
    dateType: item.dateType as 'SCHEDULED' | 'DUE' | undefined,
    duration: item.duration,
    assigneeId: item.assigneeId,
    participants: item.participants,
    taskId: parentId,
    occurrenceDateKey,
  }, {
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleComplete: handleToggle,
    onInvite: item.isForAllMembers && item.groupId ? () => setShowInviteModal(true) : undefined,
  });

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
              {item.title}
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
          {(item.priority || item.categoryId) && (
            <div className="flex flex-wrap items-center gap-2">
              {item.priority && <PriorityPill priority={item.priority} />}
              {item.categoryId && <CategoryPill categoryId={item.categoryId} categories={categories} />}
            </div>
          )}

          {/* Details card — shown first for date/time visibility */}
          {hasAnyDetail && (
            <div className="rounded-(--radius-card) border border-(--el-panel-border)">
              {dateDisplay && (
                <DetailRow icon="calendar_today" label={t('itemView.date')} value={dateDisplay} />
              )}
              {timeDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="schedule" label={t('itemView.time')} value={timeDisplay} />
                </>
              )}
              {timeOfDayDisplay && TIME_OF_DAY_META[timeOfDayDisplay] && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow
                    icon={TIME_OF_DAY_META[timeOfDayDisplay].icon}
                    label={t('itemView.time')}
                    value={t(TIME_OF_DAY_META[timeOfDayDisplay].i18nKey)}
                  />
                </>
              )}
              {durationDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="timer" label={t('itemView.duration')} value={durationDisplay} />
                </>
              )}
              {reminderDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="notifications" label={t('itemView.reminder')} value={reminderDisplay} />
                </>
              )}
              {secondReminderDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="notifications" label={t('itemView.reminder')} value={secondReminderDisplay} />
                </>
              )}
              {/* (A4) Completion timestamp */}
              {completionDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="check_circle" label={t('itemView.completedAt')} value={completionDisplay} />
                </>
              )}
              {/* (A5) Activity ended indicator */}
              {activityEnded && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon name="event_busy" size={18} color="var(--el-dialog-confirm-bg)" />
                    <span className="text-[13px] font-medium" style={{ color: 'var(--el-dialog-confirm-bg)' }}>
                      {t('itemView.activityEnded')}
                    </span>
                  </div>
                </>
              )}
              {/* (A11) Location — clickable, opens Google Maps */}
              {locationDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon name="location_on" size={18} color="var(--el-panel-detail-label)" />
                    <span className="w-20 shrink-0 text-[13px] text-(--el-panel-detail-label)">{t('itemView.location')}</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationDisplay)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[13px] font-medium text-(--el-panel-detail-value) hover:underline"
                    >
                      {locationDisplay}
                    </a>
                  </div>
                </>
              )}
              {guestsDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Icon name="group" size={18} color="var(--el-panel-detail-label)" className="mt-0.5" />
                    <div className="flex-1">
                      <span className="text-[13px] text-(--el-panel-detail-label)">{t('itemView.guests')}</span>
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
              {meetingLinkDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon name="videocam" size={18} color="var(--el-panel-detail-label)" />
                    <span className="w-20 shrink-0 text-[13px] text-(--el-panel-detail-label)">{t('itemView.meetingLink')}</span>
                    <a href={meetingLinkDisplay} target="_blank" rel="noopener noreferrer" className="truncate text-[13px] font-medium text-(--el-panel-detail-value) hover:underline">
                      {meetingLinkDisplay}
                    </a>
                  </div>
                </>
              )}
              {tzDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="public" label={t('itemView.timeZone')} value={tzDisplay} />
                </>
              )}
              {repeatDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="repeat" label={t('itemView.repeat')} value={repeatDisplay} />
                </>
              )}
              {/* (A6) Organizer display */}
              {organizerDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="person" label={t('itemView.organizer')} value={organizerDisplay} />
                </>
              )}
              {createdAtRaw && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow
                    icon="event_available"
                    label={t('itemView.createdAt')}
                    value={new Date(createdAtRaw).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                  />
                </>
              )}
            </div>
          )}

          {/* Group activity participation banner — uses local status, not API */}
          {isGroupTask && item.isForAllMembers && !isChecked && (
            <ParticipationBanner
              taskId={parentId}
              status={item.participantInstanceStatus || 'NONE'}
              isRecurring={recurring}
              date={occurrenceDateKey}
              isOrganizer={item.userId === currentUserId}
            />
          )}

          {/* Description */}
          {item.description && (
            <CollapsibleDescription content={item.description} />
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
          {isGroupTask && item.isForAllMembers && localParticipantStats && (
            <div className="mx-4 my-2">
              <ParticipantsList
                participants={localParticipantStats.participants}
                invitedParticipants={localParticipantStats.invitedParticipants}
                notGoingParticipants={localParticipantStats.notGoingParticipants}
                totalParticipants={localParticipantStats.totalParticipants}
                completedCount={localParticipantStats.completedCount}
                currentUserId={currentUserId}
                organizerId={item.userId ?? ''}
                trackCompletion={item.trackCompletion}
              />
            </div>
          )}

          {/* Group task assignment info */}
          {isGroupTask && !item.isForAllMembers && item.assigneeName && (
            <AssigneeDisplay
              assigneeName={item.assigneeName}
              assigneeId={item.assigneeId}
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
        {item.isForAllMembers && item.groupId && (
          <InviteParticipantsModal
            open={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            groupId={item.groupId}
            taskId={parentId}
            taskDate={occurrenceDateKey}
            existingUserIds={[
              ...(localParticipantStats?.participants.map(p => p.id) ?? []),
              ...(localParticipantStats?.invitedParticipants?.map(p => p.id) ?? []),
              ...(localParticipantStats?.notGoingParticipants?.map(p => p.id) ?? []),
            ]}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
