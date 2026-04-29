import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { formatFullDate, formatTime } from '@/utils/date';
import { getCategoryName, getCategoryColor } from '@/utils/category';
import { useDisplay } from '@/lib/contexts/display-context';
import { getParentId, getOccurrenceDateKey, isRecurringInstance } from '@/utils/calendarItemId';
import { RecurringScopeModal } from './RecurringScopeModal';
import { AssigneeDisplay } from '@/components/groups/AssigneeDisplay';
import { CompletionStatsDisplay } from '@/components/groups/CompletionStatsDisplay';
import { ParticipationActions } from '@/components/groups/ParticipationActions';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { TimeFormat } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import DOMPurify from 'dompurify';
import { isHtml } from '@/utils/html';

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
  const p = priority.toLowerCase();
  const isHigh = p === 'high' || p === 'urgent';
  const bg = isHigh ? 'var(--el-panel-priority-high-bg)' : 'var(--el-panel-priority-normal-bg)';
  const text = isHigh ? 'var(--el-panel-priority-high-text)' : 'var(--el-panel-priority-normal-text)';
  const label = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
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
  const name = getCategoryName(categoryId, categories);
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

// ── Format reminder ──

function formatReminder(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  if (minutes === 0) return 'At time';
  if (minutes < 60) return `${minutes} min before`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    return `${h} hr${h > 1 ? 's' : ''} before`;
  }
  const d = Math.floor(minutes / 1440);
  return `${d} day${d > 1 ? 's' : ''} before`;
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
  const [isClosing, setIsClosing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scopeModalMode, setScopeModalMode] = useState<'edit' | 'delete' | null>(null);
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

  // ── Permissions (matching dooooApp's canUserEditTask / canUserDeleteTask) ──
  const isTaskOwner = item.userId === currentUserId;
  const isGroupTask = !!item.groupId;
  const canEdit = item.itemType === 'EVENT' || (!item.isCompleted && (!isGroupTask || isTaskOwner));
  const canDelete = item.itemType === 'EVENT' || !isGroupTask || isTaskOwner;

  // Resolve the parent task/event id (never the virtual occurrence id) so all
  // routing and mutations target the actual backend record.
  const parentId = getParentId(item);
  const occurrenceDateKey = getOccurrenceDateKey(item);
  const recurring = isRecurringInstance(item);
  const typeParam = item.itemType.toLowerCase();

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

  const dateDisplay = item.date ? formatFullDate(new Date(item.date)) : null;
  const timeDisplay = item.hasTime && item.date ? formatTime(item.date, timeFormat as TimeFormat) : null;
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

  // Repeat display
  const repeatDisplay = item.repeat
    ? (() => {
        const r = item.repeat as { type?: string; interval?: number };
        if (r.type === 'daily') return r.interval && r.interval > 1 ? `Every ${r.interval} days` : 'Daily';
        if (r.type === 'weekly') return r.interval && r.interval > 1 ? `Every ${r.interval} weeks` : 'Weekly';
        if (r.type === 'monthly') return r.interval && r.interval > 1 ? `Every ${r.interval} months` : 'Monthly';
        if (r.type === 'yearly') return r.interval && r.interval > 1 ? `Every ${r.interval} years` : 'Yearly';
        return 'Repeats';
      })()
    : null;

  const durationDisplay = item.duration ? `${item.duration} min` : null;
  const reminderDisplay = formatReminder(item.firstReminderMinutes);
  const secondReminderDisplay = formatReminder(item.secondReminderMinutes);
  const locationDisplay = item.location || null;
  const guestsDisplay = item.guests && item.guests.length > 0 ? item.guests : null;
  const meetingLinkDisplay = item.meetingLink || null;

  const createdAtRaw = item.sourceTask?.createdAt || item.sourceEvent?.createdAt;
  const hasAnyDetail = dateDisplay || timeDisplay || timeOfDayDisplay || tzDisplay || repeatDisplay || durationDisplay || reminderDisplay || locationDisplay || guestsDisplay || meetingLinkDisplay || createdAtRaw;

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
              <button onClick={handleToggle} className="shrink-0">
                {isChecked ? (
                  <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-(--el-item-checkbox-bg)">
                    <Icon name="check" size={14} color="var(--el-item-checkbox-mark)" weight={700} />
                  </div>
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
            {canEdit && (
              <button
                data-testid="side-panel-edit"
                onClick={handleEdit}
                className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg)"
                title={t('itemView.edit')}
              >
                <Icon name="edit" size={18} />
              </button>
            )}
            <button
              data-testid="side-panel-expand"
              onClick={handleExpand}
              className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg)"
              title={t('itemView.expand')}
            >
              <Icon name="open_in_full" size={18} />
            </button>
            {canDelete && (
              <button
                data-testid="side-panel-delete"
                onClick={handleDeleteClick}
                className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg)"
                title={t('itemView.delete')}
              >
                <Icon name="delete" size={18} />
              </button>
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

          {/* Description */}
          {item.description && (
            isHtml(item.description) ? (
              <div
                className="rich-text text-sm text-(--el-panel-description)"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.description) }}
              />
            ) : (
              <p className="text-sm leading-relaxed text-(--el-panel-description)">{item.description}</p>
            )
          )}

          {/* Details card */}
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
              {locationDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="location_on" label={t('itemView.location')} value={locationDisplay} />
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

          {/* Group task assignment info */}
          {isGroupTask && !item.isForAllMembers && item.assigneeName && (
            <AssigneeDisplay
              assigneeName={item.assigneeName}
              assigneeId={item.assigneeId}
              currentUserId={currentUserId}
            />
          )}

          {/* Group activity participation + completion stats */}
          {isGroupTask && item.isForAllMembers && (
            <>
              {currentUserId !== item.userId && (
                <ParticipationActions
                  taskId={parentId}
                  isRecurring={recurring}
                  date={occurrenceDateKey}
                />
              )}
              <CompletionStatsDisplay
                taskId={parentId}
                currentUserId={currentUserId}
                organizerId={item.userId}
                trackCompletion={item.trackCompletion}
              />
            </>
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
      </div>
    </div>,
    document.body,
  );
}
