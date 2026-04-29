import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useDisplay } from '@/lib/contexts/display-context';
import type { PlanTemplate } from '@/types/target';
import type { Repeat } from '@/types/api';

interface PlanTemplateDetailPanelProps {
  template: PlanTemplate;
  scheduledDate?: Date;
  onClose: () => void;
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon name={icon} size={18} color="var(--el-panel-detail-label)" />
      <span className="w-20 shrink-0 text-[13px] text-(--el-panel-detail-label)">{label}</span>
      <span className="text-[13px] font-medium text-(--el-panel-detail-value)">{value}</span>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(time: string, timeFormat: '12h' | '24h' = '12h'): string {
  const [h, m] = time.split(':').map(Number);
  if (timeFormat === '24h') {
    return `${h}:${m.toString().padStart(2, '0')}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

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

function formatScheduledDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function PlanTemplateDetailPanel({ template, scheduledDate, onClose }: PlanTemplateDetailPanelProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();
  const [isClosing, setIsClosing] = useState(false);
  const isEvent = template.type === 'event';

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  // Repeat display
  const repeatDisplay = template.repeat
    ? (() => {
        try {
          const r: Repeat = JSON.parse(template.repeat);
          const interval = r.interval || 1;
          if (r.type === 'weekly' && r.weekdays && r.weekdays.length > 0) {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const sorted = [...r.weekdays].sort((a, b) => ((a || 7) - (b || 7)));
            const names = sorted.map(d => dayNames[d]);
            const base = names.join(', ');
            return interval > 1 ? `Every ${interval} weeks (${base})` : `Weekly (${base})`;
          }
          if (interval === 1) {
            const labels: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
            return labels[r.type] || 'Repeats';
          }
          const plural: Record<string, string> = { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' };
          return `Every ${interval} ${plural[r.type] || 'days'}`;
        } catch {
          return 'Repeats';
        }
      })()
    : null;

  // Occurrence count from repeat
  const occurrenceDisplay = template.repeat
    ? (() => {
        try {
          const r: Repeat = JSON.parse(template.repeat);
          if (r.endCondition?.type === 'count' && r.endCondition.occurrences) {
            return `${r.endCondition.occurrences} occurrences`;
          }
          if (r.endCondition?.type === 'date' && r.endCondition.endDate) {
            return `Until ${new Date(r.endCondition.endDate).toLocaleDateString()}`;
          }
          return null;
        } catch {
          return null;
        }
      })()
    : null;

  const timeDisplay = template.time ? formatTime(template.time, timeFormat) : null;
  const durationDisplay = template.duration ? formatDuration(template.duration) : null;
  const dateDisplay = scheduledDate ? formatScheduledDate(scheduledDate) : null;
  const reminderDisplay = formatReminder(template.firstReminderMinutes);
  const secondReminderDisplay = formatReminder(template.secondReminderMinutes);
  const locationDisplay = template.location || null;
  const meetingLinkDisplay = isEvent && 'meetingLink' in template ? (template as { meetingLink?: string | null }).meetingLink : null;

  const hasAnyDetail = dateDisplay || timeDisplay || durationDisplay || repeatDisplay || reminderDisplay || locationDisplay || meetingLinkDisplay || template.gapDays > 0;

  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" onClick={handleClose}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-(--el-modal-overlay) ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} />

      {/* Panel */}
      <div
        data-testid="template-detail-panel"
        className={`relative flex h-full w-[420px] max-w-full flex-col bg-(--el-panel-bg) shadow-[-4px_0_16px_rgba(0,0,0,0.12)] ${isClosing ? 'animate-panel-out' : 'animate-panel-in'}`}
        style={{ borderLeft: '1px solid var(--el-panel-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--el-panel-header-border) px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {isEvent ? (
              <Icon name="event" size={20} color="#5b21b6" className="shrink-0" />
            ) : (
              <Icon name="task_alt" size={20} color="var(--el-target-chevron)" className="shrink-0" />
            )}
            <span className="truncate text-lg font-semibold text-(--el-panel-title)" data-testid="template-detail-title">
              {template.title}
            </span>
          </div>

          <button
            data-testid="template-detail-close"
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg)"
            title={t('common.close')}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
          {/* Description */}
          {template.description && (
            <p className="text-sm leading-relaxed text-(--el-panel-description)">{template.description}</p>
          )}

          {/* Details card */}
          {hasAnyDetail && (
            <div className="rounded-(--radius-card) border border-(--el-panel-separator)" data-testid="template-detail-card">
              {dateDisplay && (
                <DetailRow icon="calendar_today" label={t('itemView.date')} value={dateDisplay} />
              )}
              {timeDisplay && (
                <>
                  {dateDisplay && <div className="mx-4 border-t border-(--el-panel-separator)" />}
                  <DetailRow icon="schedule" label={t('itemView.time')} value={timeDisplay} />
                </>
              )}
              {durationDisplay && (
                <>
                  {(dateDisplay || timeDisplay) && <div className="mx-4 border-t border-(--el-panel-separator)" />}
                  <DetailRow icon="timer" label={t('itemView.duration')} value={durationDisplay} />
                </>
              )}
              {template.gapDays > 0 && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <DetailRow icon="schedule" label={t('targetPlan.gapDays', 'Gap')} value={`+${template.gapDays} day${template.gapDays > 1 ? 's' : ''}`} />
                </>
              )}
              {repeatDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Icon name="repeat" size={18} color="var(--el-panel-detail-label)" className="mt-0.5" />
                    <span className="w-20 shrink-0 text-[13px] text-(--el-panel-detail-label)">{t('itemView.repeat')}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-(--el-panel-detail-value)">{repeatDisplay}</span>
                      {occurrenceDisplay && (
                        <span className="text-[12px] text-(--el-panel-detail-label)">{occurrenceDisplay}</span>
                      )}
                    </div>
                  </div>
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
              {meetingLinkDisplay && (
                <>
                  <div className="mx-4 border-t border-(--el-panel-separator)" />
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon name="videocam" size={18} color="var(--el-panel-detail-label)" />
                    <span className="w-20 shrink-0 text-[13px] text-(--el-panel-detail-label)">{t('itemView.meetingLink')}</span>
                    <a href={meetingLinkDisplay} target="_blank" rel="noopener noreferrer" className="truncate text-[13px] font-medium text-(--el-target-chevron) hover:underline">
                      {meetingLinkDisplay}
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
