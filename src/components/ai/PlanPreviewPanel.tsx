import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { Icon } from '@/components/ui/Icon';
import { PlanTemplateItem } from '@/components/targets/PlanTemplateItem';
import { calculateTemplateScheduledDates } from '@/utils/planScheduler';
import type { Plan, PlanTemplate } from '@/types/target';
import type { Repeat } from '@/types/api';

interface PlanPreviewPanelProps {
  open: boolean;
  onClose: () => void;
  plan: Plan | null;
  templates: PlanTemplate[];
  loading: boolean;
  onStartPlan: () => void;
}

const isHtml = (text: string) => /<[^>]+>/.test(text);

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
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

function formatRepeatDisplay(repeatJson: string): string | null {
  try {
    const r: Repeat = JSON.parse(repeatJson);
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
}

function formatOccurrenceDisplay(repeatJson: string): string | null {
  try {
    const r: Repeat = JSON.parse(repeatJson);
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

export function PlanPreviewPanel({
  open,
  onClose,
  plan,
  templates,
  loading,
  onStartPlan,
}: PlanPreviewPanelProps) {
  const { t } = useTranslation();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null);

  const scheduledDates = useMemo(() => {
    return calculateTemplateScheduledDates(templates, plan?.archetype);
  }, [templates, plan?.archetype]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setSelectedTemplate(null);
      onClose();
    }, 200);
  }, [onClose]);

  // Reset detail view when panel closes
  useEffect(() => {
    if (!open) {
      setSelectedTemplate(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  if (!open && !isClosing) return null;

  // Sanitize HTML description using DOMPurify (same pattern as PlanDetailPage.tsx)
  const sanitizedDescription = plan?.description && isHtml(plan.description)
    ? DOMPurify.sanitize(plan.description)
    : null;

  // Detail view computed values
  const selectedIndex = selectedTemplate
    ? templates.findIndex(t => t.id === selectedTemplate.id)
    : -1;
  const selectedDate = selectedIndex >= 0 ? scheduledDates[selectedIndex] : undefined;
  const isEvent = selectedTemplate?.type === 'event';

  const timeDisplay = selectedTemplate?.time ? formatTime(selectedTemplate.time) : null;
  const durationDisplay = selectedTemplate?.duration ? formatDuration(selectedTemplate.duration) : null;
  const dateDisplay = selectedDate ? formatScheduledDate(selectedDate) : null;
  const repeatDisplay = selectedTemplate?.repeat ? formatRepeatDisplay(selectedTemplate.repeat) : null;
  const occurrenceDisplay = selectedTemplate?.repeat ? formatOccurrenceDisplay(selectedTemplate.repeat) : null;
  const reminderDisplay = selectedTemplate ? formatReminder(selectedTemplate.firstReminderMinutes) : null;
  const secondReminderDisplay = selectedTemplate ? formatReminder(selectedTemplate.secondReminderMinutes) : null;
  const locationDisplay = selectedTemplate?.location || null;
  const meetingLinkDisplay = isEvent && selectedTemplate && 'meetingLink' in selectedTemplate
    ? (selectedTemplate as { meetingLink?: string | null }).meetingLink
    : null;

  const hasAnyDetail = dateDisplay || timeDisplay || durationDisplay || repeatDisplay
    || reminderDisplay || locationDisplay || meetingLinkDisplay
    || (selectedTemplate && selectedTemplate.gapDays > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex justify-end"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-(--el-dialog-overlay) ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} />

      {/* Panel */}
      <div
        className={`relative flex h-full w-[420px] max-w-full flex-col bg-(--el-panel-bg) shadow-[-4px_0_16px_rgba(0,0,0,0.12)] ${isClosing ? 'animate-panel-out' : 'animate-panel-in'}`}
        style={{ borderLeft: '1px solid var(--el-panel-border)' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="plan-preview-panel"
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center" data-testid="plan-preview-loading">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--el-btn-primary-bg) border-t-transparent" />
          </div>
        ) : !plan ? null : selectedTemplate ? (
          /* ── Detail view ── */
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-(--el-panel-header-border) px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg) hover:text-(--el-panel-title)"
                data-testid="plan-preview-back"
              >
                <Icon name="arrow_back" size={20} />
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {isEvent ? (
                  <Icon name="event" size={18} color="#5b21b6" className="shrink-0" />
                ) : (
                  <Icon name="task_alt" size={18} color="var(--el-ai-session-text)" className="shrink-0" />
                )}
                <span className="truncate text-base font-semibold text-(--el-panel-title)">
                  {selectedTemplate.title}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg) hover:text-(--el-panel-title)"
                data-testid="plan-preview-close"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Detail body */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
              {selectedTemplate.description && (
                <p className="text-sm leading-relaxed text-(--el-panel-description)">{selectedTemplate.description}</p>
              )}

              {hasAnyDetail && (
                <div className="rounded-(--radius-card) border border-(--el-panel-border)">
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
                  {selectedTemplate.gapDays > 0 && (
                    <>
                      <div className="mx-4 border-t border-(--el-panel-separator)" />
                      <DetailRow
                        icon="schedule"
                        label={t('targetPlan.gapDays', 'Gap')}
                        value={`+${selectedTemplate.gapDays} day${selectedTemplate.gapDays > 1 ? 's' : ''}`}
                      />
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
                        <a
                          href={meetingLinkDisplay}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-[13px] font-medium text-(--el-ai-session-text) hover:underline"
                        >
                          {meetingLinkDisplay}
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── List view ── */
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-(--el-panel-header-border) px-4 py-3">
              <h2 className="truncate text-lg font-semibold text-(--el-panel-title)">{plan.name}</h2>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg) hover:text-(--el-panel-title)"
                data-testid="plan-preview-close"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              {/* Description — HTML content is sanitized via DOMPurify before rendering */}
              {sanitizedDescription ? (
                <div
                  className="prose prose-sm px-4 py-3 text-(--el-plan-description) dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              ) : plan.description ? (
                <p className="px-4 py-3 text-sm leading-relaxed text-(--el-plan-description)">{plan.description}</p>
              ) : null}

              {/* Template list */}
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon name="assignment" size={32} color="var(--el-panel-detail-label)" />
                  <p className="mt-2 text-sm text-(--el-panel-detail-label)">{t('aiChat.planPreviewNoTemplates')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-4 py-2">
                  {templates.map((template, index) => (
                    <PlanTemplateItem
                      key={template.id}
                      template={template}
                      index={index}
                      scheduledDate={scheduledDates[index]}
                      onClick={() => setSelectedTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Start Plan button */}
            {templates.length > 0 && (
              <div className="border-t border-(--el-panel-separator) px-4 py-3">
                <button
                  type="button"
                  onClick={onStartPlan}
                  className="flex w-full items-center justify-center gap-2 rounded-(--radius-card) bg-(--el-btn-primary-bg) px-4 py-3 text-sm font-semibold text-(--el-btn-primary-text) hover:opacity-90"
                  data-testid="plan-preview-start"
                >
                  <Icon name="play_arrow" size={20} />
                  {t('targetPlan.startPlan')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
