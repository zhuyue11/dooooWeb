import { useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTask, getEvent, toggleTask } from '@/lib/api';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useCategories } from '@/hooks/useCategories';
import { useDisplay } from '@/lib/contexts/display-context';
import { Icon } from '@/components/ui/Icon';
import { formatFullDate, formatTime } from '@/utils/date';
import { getCategoryName, getCategoryColor } from '@/utils/category';
import type { TimeFormat } from '@/utils/date';
import type { Task, Event as ApiEvent } from '@/types/api';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import { useState } from 'react';

// ── Detail row ──

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon name={icon} size={16} color="var(--color-muted-foreground)" />
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
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

  const handleToggle = useCallback(async () => {
    if (!id || type === 'event') return;
    await toggleTask(id);
    queryClient.invalidateQueries({ queryKey: ['task', id] });
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-todo'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-today'] });
  }, [id, type, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  if (!item || isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <span className="text-sm text-muted-foreground">Item not found</span>
        <button onClick={handleBack} className="text-sm font-medium text-primary hover:underline">
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

  const hasAnyDetail = dateDisplay || timeDisplay || durationDisplay || reminderDisplay || locationDisplay || item.repeat != null;

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
      <button onClick={handleBack} className="mb-6 flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground">
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
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Icon name="check" size={16} color="var(--color-primary-foreground)" weight={700} />
                  </div>
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-primary" />
                )}
              </button>
            )}
            {!isTask && <Icon name="calendar_today" size={22} color="#5b21b6" />}
            <h1 className={`text-[22px] font-bold ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {title}
            </h1>
          </div>

          {/* Meta row: pills + date summary */}
          <div className="flex flex-wrap items-center gap-2">
            {planId && (
              <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: '#360EFF20', color: 'var(--color-primary)' }}>
                <Icon name="stars" size={12} color="var(--color-primary)" />
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
              <span className="text-[13px] text-muted-foreground">
                {dateDisplay}
                {timeDisplay && ` · ${timeDisplay}`}
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
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-foreground hover:bg-muted"
            >
              <Icon name="edit" size={16} />
              {t('itemView.edit')}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-destructive hover:bg-muted"
            >
              <Icon name="delete" size={16} color="var(--color-destructive)" />
              {t('itemView.delete')}
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mb-6 border-t border-border" />

      {/* Content: two-column */}
      <div className="flex gap-8">
        {/* Left: article */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {description && (
            <p className="text-[15px] leading-relaxed text-foreground" style={{ lineHeight: '1.7' }}>
              {description}
            </p>
          )}
          {!description && (
            <p className="text-sm text-muted-foreground italic">No description</p>
          )}
        </div>

        {/* Right: info sidebar */}
        <div className="flex w-[300px] shrink-0 flex-col gap-4">
          {/* Info card */}
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
              <div className="mx-4 border-t border-border" />
              <DetailRow icon="repeat" label={t('itemView.repeat')} value={repeatDisplay} />
            </div>
          )}

          {/* Plan card */}
          {planId && planName && (
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: '#360EFF10', border: '1px solid #360EFF30' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon name="stars" size={16} color="var(--color-primary)" />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--color-primary)' }}>
                  Part of a Plan
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{planName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Created timestamp */}
      {createdAt && (
        <div className="mt-8 text-xs text-muted-foreground">
          {t('itemView.createdAt', {
            date: new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
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
                disabled={deleteTaskMutation.isPending || deleteEventMutation.isPending}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
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
