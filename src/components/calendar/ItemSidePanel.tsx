import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { formatFullDate, formatTime } from '@/utils/date';
import { getCategoryName, getCategoryColor } from '@/utils/category';
import { useDisplay } from '@/lib/contexts/display-context';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { TimeFormat } from '@/utils/date';
import { useTranslation } from 'react-i18next';

interface ItemSidePanelProps {
  item: CalendarItem;
  currentUserId?: string;
  onClose: () => void;
  onToggle?: (item: CalendarItem) => void;
}

// ── Detail row ──

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon name={icon} size={18} color="var(--color-muted-foreground)" />
      <span className="w-20 shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}

// ── Priority pill ──

function PriorityPill({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  const isHigh = p === 'high' || p === 'urgent';
  const bg = isHigh ? '#ef444420' : '#f59e0b20';
  const text = isHigh ? '#ef4444' : '#f59e0b';
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

export function ItemSidePanel({ item, currentUserId, onClose, onToggle }: ItemSidePanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { timeFormat } = useDisplay();
  const { deleteTaskMutation, deleteEventMutation } = useItemMutations();
  const [isClosing, setIsClosing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  // CalendarItem IDs for events are prefixed with "event-" — strip it for API calls
  const apiId = item.itemType === 'EVENT' ? item.id.replace(/^event-/, '') : item.id;
  const typeParam = item.itemType.toLowerCase();

  const handleExpand = useCallback(() => {
    onClose();
    navigate(`/items/${apiId}?type=${typeParam}`);
  }, [navigate, apiId, typeParam, onClose]);

  const handleEdit = useCallback(() => {
    onClose();
    navigate(`/items/${apiId}/edit?type=${typeParam}`);
  }, [navigate, apiId, typeParam, onClose]);

  const handleDelete = useCallback(async () => {
    if (item.itemType === 'EVENT') {
      await deleteEventMutation.mutateAsync(apiId);
    } else {
      await deleteTaskMutation.mutateAsync(apiId);
    }
    onClose();
  }, [deleteTaskMutation, deleteEventMutation, apiId, item.itemType, onClose]);

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
  const durationDisplay = item.duration ? `${item.duration} min` : null;
  const reminderDisplay = formatReminder(item.firstReminderMinutes);
  const locationDisplay = item.location || null;

  const hasAnyDetail = dateDisplay || timeDisplay || durationDisplay || reminderDisplay || locationDisplay;

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" onClick={handleClose}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/20 ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative flex h-full w-[420px] max-w-full flex-col bg-surface shadow-[-4px_0_16px_rgba(0,0,0,0.12)] ${isClosing ? 'animate-panel-out' : 'animate-panel-in'}`}
        style={{ borderLeft: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          {/* Left: checkbox + title */}
          <div className="flex min-w-0 items-center gap-3">
            {shouldShowToggle ? (
              <button onClick={handleToggle} className="shrink-0">
                {isChecked ? (
                  <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-primary">
                    <Icon name="check" size={14} color="var(--color-primary-foreground)" weight={700} />
                  </div>
                ) : (
                  <div className="h-[22px] w-[22px] rounded-full border-2 border-primary" />
                )}
              </button>
            ) : !isTask ? (
              <Icon name="calendar_today" size={20} color="#5b21b6" className="shrink-0" />
            ) : null}
            <span className={`truncate text-lg font-semibold ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {item.title}
            </span>
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 items-center gap-1">
            {canEdit && (
              <button
                data-testid="side-panel-edit"
                onClick={handleEdit}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                title={t('itemView.edit')}
              >
                <Icon name="edit" size={18} />
              </button>
            )}
            <button
              data-testid="side-panel-expand"
              onClick={handleExpand}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              title={t('itemView.expand')}
            >
              <Icon name="open_in_full" size={18} />
            </button>
            {canDelete && (
              <button
                data-testid="side-panel-delete"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                title={t('itemView.delete')}
              >
                <Icon name="delete" size={18} />
              </button>
            )}
            <button
              data-testid="side-panel-close"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
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
            <p className="text-sm leading-relaxed text-foreground">{item.description}</p>
          )}

          {/* Details card */}
          {hasAnyDetail && (
            <div className="rounded-lg border border-border">
              {dateDisplay && (
                <DetailRow icon="calendar_today" label={t('itemView.date')} value={dateDisplay} />
              )}
              {timeDisplay && (
                <>
                  <div className="mx-4 border-t border-border" />
                  <DetailRow icon="schedule" label={t('itemView.time')} value={timeDisplay} />
                </>
              )}
              {durationDisplay && (
                <>
                  <div className="mx-4 border-t border-border" />
                  <DetailRow icon="timer" label={t('itemView.duration')} value={durationDisplay} />
                </>
              )}
              {reminderDisplay && (
                <>
                  <div className="mx-4 border-t border-border" />
                  <DetailRow icon="notifications" label={t('itemView.reminder')} value={reminderDisplay} />
                </>
              )}
              {locationDisplay && (
                <>
                  <div className="mx-4 border-t border-border" />
                  <DetailRow icon="location_on" label={t('itemView.location')} value={locationDisplay} />
                </>
              )}
            </div>
          )}

          {/* Created/updated timestamp */}
          {(item.sourceTask?.createdAt || item.sourceEvent?.createdAt) && (
            <span className="text-xs text-muted-foreground">
              {t('itemView.createdAt', {
                date: new Date((item.sourceTask?.createdAt || item.sourceEvent?.createdAt)!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              })}
            </span>
          )}
        </div>

        {/* ── Delete confirmation overlay ── */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="mx-6 w-full max-w-sm rounded-xl bg-surface p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-foreground">{t('itemView.confirmDelete')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('itemView.deleteDescription')}</p>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteTaskMutation.isPending}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {(deleteTaskMutation.isPending || deleteEventMutation.isPending) ? t('common.deleting') : t('itemView.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
