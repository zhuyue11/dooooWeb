import { useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTask, getEvent, toggleTask } from '@/lib/api';
import { usePlanReview } from '@/lib/contexts/plan-review-context';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { useDisplay } from '@/lib/contexts/display-context';
import { Icon } from '@/components/ui/Icon';
import { formatFullDate, formatTime } from '@/utils/date';
import { getCategoryName, getCategoryColor } from '@/utils/category';
import type { TimeFormat } from '@/utils/date';
import type { Task, Event as ApiEvent } from '@/types/api';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { useState } from 'react';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch item — cast to shared type to avoid union issues
  const { data: item, isLoading, isError } = useQuery<Task | ApiEvent>({
    queryKey: [type === 'event' ? 'event' : 'task', id],
    queryFn: () => type === 'event' ? getEvent(id!) as Promise<Task | ApiEvent> : getTask(id!),
    enabled: !!id,
    retry: false,
  });

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
          {t('itemView.backToCalendar')}
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
  const dateDisplay = dateStr ? formatFullDate(new Date(dateStr)) : null;
  const timeDisplay = item.hasTime && dateStr ? formatTime(dateStr, timeFormat as TimeFormat) : null;
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

  const durationDisplay = item.duration ? `${item.duration} min` : null;
  const reminderDisplay = formatReminder(item.firstReminderMinutes);
  const repeatDisplay = item.repeat ? 'Yes' : 'None';
  const locationDisplay = item.location || null;
  const priority = isTask ? taskItem?.priority : eventItem?.priority;
  const categoryId = isTask ? taskItem?.categoryId : undefined;
  const categoryName = categoryId ? getCategoryName(categoryId, categories) : undefined;
  const categoryColor = categoryId ? getCategoryColor(categoryId, categories) : undefined;
  const planId = isTask ? taskItem?.planId : undefined;
  const planName = isTask ? taskItem?.plan?.name : undefined;
  const createdAt = item.createdAt;

  const hasAnyDetail = dateDisplay || timeDisplay || timeOfDayValue || tzDisplay || durationDisplay || reminderDisplay || locationDisplay || item.repeat != null;

  // Permissions (matching dooooApp's canUserEditTask / canUserDeleteTask)
  const itemUserId = isTask ? taskItem?.userId : (eventItem as ApiEvent & { userId?: string })?.userId;
  const groupId = isTask ? taskItem?.groupId : undefined;
  const isItemOwner = itemUserId === user?.id;
  const isGroupItem = !!groupId;
  const canEdit = !isTask || (!isCompleted && (!isGroupItem || isItemOwner));
  const canDelete = !isTask || !isGroupItem || isItemOwner;

  return (
    <div className="animate-page-enter" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Back row */}
      <button onClick={handleBack} className="mb-6 flex items-center gap-2 text-[13px] font-medium text-(--el-view-detail-label) hover:text-(--el-view-title)">
        <Icon name="arrow_back" size={20} />
        {t('itemView.backToCalendar')}
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

        {/* Right: Edit + Delete (permission-gated) */}
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center gap-1.5 rounded-(--radius-btn) border border-(--el-view-edit-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-[13px] font-medium text-(--el-view-title) hover:bg-(--el-popover-item-hover)"
            >
              <Icon name="edit" size={16} />
              {t('itemView.edit')}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-(--radius-btn) border border-(--el-view-edit-border) px-(--spacing-btn-x) py-(--spacing-btn-y) text-[13px] font-medium text-(--el-view-delete-text) hover:bg-(--el-popover-item-hover)"
            >
              <Icon name="delete" size={16} color="var(--el-view-delete-text)" />
              {t('itemView.delete')}
            </button>
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
            <p className="text-[15px] leading-relaxed text-(--el-view-title)" style={{ lineHeight: '1.7' }}>
              {description}
            </p>
          )}
          {!description && (
            <p className="text-sm text-(--el-view-detail-label) italic">No description</p>
          )}
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
              {tzDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-view-edit-border)" />
                  <DetailRow icon="public" label={t('itemView.timeZone')} value={tzDisplay} />
                </>
              )}
              <div className="mx-4 border-t border-(--el-view-edit-border)" />
              <DetailRow icon="repeat" label={t('itemView.repeat')} value={repeatDisplay} />
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
        </div>
      </div>

      {/* Created timestamp */}
      {createdAt && (
        <div className="mt-8 text-xs text-(--el-view-detail-label)">
          {t('itemView.createdAt', {
            date: new Date(createdAt).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }),
          })}
        </div>
      )}

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
    </div>
  );
}
