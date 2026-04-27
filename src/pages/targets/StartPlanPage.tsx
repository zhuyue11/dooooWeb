import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { usePlan, usePlanTemplates } from '@/hooks/usePlans';
import { executePlan } from '@/lib/api';
import { useToast } from '@/lib/contexts/toast-context';
import { Icon } from '@/components/ui/Icon';
import { CalendarPopover } from '@/components/ui/CalendarPopover';
import { TimePreferenceModal } from '@/components/targets/TimePreferenceModal';
import { StartPlanCalendarGrid } from '@/components/targets/StartPlanCalendarGrid';
import { PlanTemplateDetailPanel } from '@/components/targets/PlanTemplateDetailPanel';
import { toNoonUTC } from '@/utils/dateForm';
import { formatDateRange } from '@/utils/date';
import {
  schedulePlanTasks,
  getPlanWeekRange,
  getTasksForWeek,
  hasUnscheduledTasks,
  hasMultipleUnscheduledTasksPerDay,
  computeSuggestedStartDate,
} from '@/utils/planScheduler';
import type { ScheduleMode, TimePreference, ScheduledPlanItem } from '@/utils/planScheduler';

function getDefaultStartDate(archetype: string | null | undefined): Date {
  const now = new Date();
  const start = new Date(now);
  if (archetype === 'daily_routine' || now.getHours() >= 21) {
    start.setDate(start.getDate() + 1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

export function StartPlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: plan, isLoading: planLoading } = usePlan(planId);
  const { data: templates = [], isLoading: templatesLoading } = usePlanTemplates(planId);
  const isLoading = planLoading || templatesLoading;

  // Scheduling state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledPlanItem[]>([]);
  const [weekStarts, setWeekStarts] = useState<Date[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Preference modal state
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [showSpreadOption, setShowSpreadOption] = useState(false);
  const [preferenceApplied, setPreferenceApplied] = useState(false);

  // Template detail panel
  const [selectedTemplate, setSelectedTemplate] = useState<{
    index: number;
    date: Date;
  } | null>(null);

  // Drag-to-reschedule overrides for recurring instances
  // Key: instanceId (templateId-YYYY-MM-DD), Value: "HH:mm"
  const [instanceOverrides, setInstanceOverrides] = useState<Map<string, string>>(new Map());

  // Execution
  const [executing, setExecuting] = useState(false);

  // Initialize start date once plan loads
  useEffect(() => {
    if (templates.length === 0 || startDate !== null) return;
    const base = getDefaultStartDate(plan?.archetype);
    const suggested = computeSuggestedStartDate(templates, base);
    setStartDate(suggested || base);
  }, [templates, plan?.archetype, startDate]);

  // Check if preference modal is needed — run once when templates + startDate are ready
  useEffect(() => {
    if (templates.length === 0 || !startDate || preferenceApplied) return;

    if (hasUnscheduledTasks(templates)) {
      setShowSpreadOption(hasMultipleUnscheduledTasksPerDay(templates, plan?.archetype ?? null, startDate));
      setShowPreferenceModal(true);
    } else {
      // All templates have times — schedule immediately
      runScheduler(startDate, 'spread', 'morning', false);
      setPreferenceApplied(true);
    }
  }, [templates, startDate, plan?.archetype, preferenceApplied]);

  const runScheduler = useCallback(
    (date: Date, mode: ScheduleMode, preference: TimePreference, useTimeOfDay: boolean) => {
      const result = schedulePlanTasks(templates, date, mode, preference, plan?.archetype ?? null, useTimeOfDay);
      setScheduledTasks(result.scheduledTasks);
      setWeekStarts(getPlanWeekRange(result.scheduledTasks));
      setCurrentWeekIndex(0);
    },
    [templates, plan?.archetype],
  );

  // Store last preference for re-scheduling when start date changes
  const [lastPreference, setLastPreference] = useState<{
    mode: ScheduleMode;
    preference: TimePreference;
    useTimeOfDay: boolean;
  }>({ mode: 'spread', preference: 'morning', useTimeOfDay: false });

  const handlePreferenceConfirm = useCallback(
    (mode: ScheduleMode, preference: TimePreference, useTimeOfDay: boolean) => {
      setShowPreferenceModal(false);
      setLastPreference({ mode, preference, useTimeOfDay });
      setPreferenceApplied(true);
      if (startDate) {
        runScheduler(startDate, mode, preference, useTimeOfDay);
      }
    },
    [startDate, runScheduler],
  );

  const handlePreferenceClose = useCallback(() => {
    setShowPreferenceModal(false);
    navigate(`/plans/${planId}`);
  }, [navigate, planId]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      setStartDate(date);
      setShowDatePicker(false);
      setInstanceOverrides(new Map());
      runScheduler(date, lastPreference.mode, lastPreference.preference, lastPreference.useTimeOfDay);
    },
    [runScheduler, lastPreference],
  );

  // Drag-to-reschedule handler
  const handleDragEnd = useCallback(
    (task: ScheduledPlanItem, newDate: Date) => {
      const newHH = String(newDate.getHours()).padStart(2, '0');
      const newMM = String(newDate.getMinutes()).padStart(2, '0');
      const newTime = `${newHH}:${newMM}`;

      if (task.instanceId) {
        // Recurring instance — store override in map
        setInstanceOverrides((prev) => {
          const next = new Map(prev);
          next.set(task.instanceId!, newTime);
          return next;
        });
      } else {
        // Non-recurring — update scheduledTasks directly
        setScheduledTasks((prev) =>
          prev.map((st) =>
            st.templateId === task.templateId
              ? { ...st, date: newDate, isAutoSuggested: false }
              : st,
          ),
        );
      }
    },
    [],
  );

  const handleTaskClick = useCallback(
    (task: ScheduledPlanItem) => {
      const index = templates.findIndex((t) => t.id === task.templateId);
      if (index !== -1) {
        setSelectedTemplate({ index, date: task.date });
      }
    },
    [templates],
  );

  // Build execution payload and submit
  const handleConfirm = useCallback(async () => {
    if (executing || scheduledTasks.length === 0 || !planId || !startDate) return;

    try {
      setExecuting(true);

      const taskItems = scheduledTasks.filter((st) => !st.isEvent);
      const eventItems = scheduledTasks.filter((st) => st.isEvent);

      const tasks = taskItems.map((st) => {
        // Collect instance overrides for recurring templates
        let overrides: Array<{ date: string; time: string }> | undefined;
        if (st.repeat && instanceOverrides.size > 0) {
          const prefix = `${st.templateId}-`;
          const entries: Array<{ date: string; time: string }> = [];
          instanceOverrides.forEach((time, key) => {
            if (key.startsWith(prefix)) {
              entries.push({ date: key.slice(prefix.length), time });
            }
          });
          if (entries.length > 0) overrides = entries;
        }

        return {
          templateId: st.templateId,
          title: st.title,
          description: st.description,
          date: st.hasTime ? st.date.toISOString() : toNoonUTC(st.date).toISOString(),
          duration: st.duration,
          repeat: st.repeat,
          firstReminderMinutes: st.firstReminderMinutes ?? undefined,
          secondReminderMinutes: st.secondReminderMinutes ?? undefined,
          instanceOverrides: overrides,
          timeOfDay: st.timeOfDay || undefined,
          location: st.location || undefined,
        };
      });

      const events = eventItems.map((st) => ({
        templateId: st.templateId,
        title: st.title,
        description: st.description,
        date: st.hasTime ? st.date.toISOString() : toNoonUTC(st.date).toISOString(),
        duration: st.duration ?? undefined,
        repeat: st.repeat,
        location: st.location || undefined,
        meetingLink: st.meetingLink || undefined,
        firstReminderMinutes: st.firstReminderMinutes ?? undefined,
        secondReminderMinutes: st.secondReminderMinutes ?? undefined,
        timeOfDay: st.timeOfDay || undefined,
      }));

      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

      const response = await executePlan(planId, {
        startDate: startDateStr,
        tasks,
        events: events.length > 0 ? events : undefined,
      });

      // Build success message
      const message = response.eventsCreated
        ? t('targetPlan.tasksAndEventsCreated', {
            taskCount: response.tasksCreated,
            eventCount: response.eventsCreated,
          })
        : t('targetPlan.tasksCreated', { count: response.tasksCreated });

      showToast(message, 'success');

      // Invalidate queries so PlanDetailPage shows the new execution
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plans'] }),
        queryClient.invalidateQueries({ queryKey: ['plan', planId] }),
        queryClient.invalidateQueries({ queryKey: ['planExecutions'] }),
        queryClient.invalidateQueries({ queryKey: ['planExecutions', planId] }),
      ]);

      navigate(`/plans/${planId}`);
    } catch {
      showToast(t('targetPlan.executePlanError', 'Failed to create tasks. Please try again.'), 'error');
    } finally {
      setExecuting(false);
    }
  }, [executing, scheduledTasks, planId, startDate, t, showToast, queryClient, navigate]);

  // Week dates for current page
  const weekDates = useMemo(() => {
    if (weekStarts.length === 0 || !weekStarts[currentWeekIndex]) return [];
    const ws = weekStarts[currentWeekIndex];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStarts, currentWeekIndex]);

  // Tasks for the current visible week, with drag overrides applied
  const weekTasks = useMemo(() => {
    if (weekStarts.length === 0 || !weekStarts[currentWeekIndex]) return [];
    const tasks = getTasksForWeek(weekStarts[currentWeekIndex], scheduledTasks);
    if (instanceOverrides.size === 0) return tasks;
    return tasks.map((task) => {
      if (task.instanceId && instanceOverrides.has(task.instanceId)) {
        const [h, m] = instanceOverrides.get(task.instanceId)!.split(':').map(Number);
        const newDate = new Date(task.date);
        newDate.setHours(h, m, 0, 0);
        return { ...task, date: newDate, isAutoSuggested: false };
      }
      return task;
    });
  }, [weekStarts, currentWeekIndex, scheduledTasks, instanceOverrides]);

  // Week label
  const weekLabel = useMemo(() => {
    if (weekDates.length < 7) return '';
    return formatDateRange(weekDates[0], weekDates[6]);
  }, [weekDates]);

  // Simplified scheduled dates for template detail panel
  const scheduledDates = useMemo(() => {
    if (!startDate) return [];
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    let cumulativeGap = 0;
    return templates.map((tmpl) => {
      cumulativeGap += tmpl.gapDays;
      const d = new Date(s);
      d.setDate(d.getDate() + cumulativeGap);
      return d;
    });
  }, [templates, startDate]);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Loading
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Not found
  if (!plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" style={{ fontFamily: 'Inter, sans-serif' }} data-testid="start-plan-page">
        <Icon name="assignment" size={48} color="var(--color-muted-foreground)" />
        <span className="text-base font-medium text-foreground">{t('targetPlan.planNotFound')}</span>
        <button
          type="button"
          onClick={() => navigate('/plans')}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t('targetPlan.plans')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3" style={{ fontFamily: 'Inter, sans-serif' }} data-testid="start-plan-page">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-3">
        {/* Back + plan name */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/plans/${planId}`)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            data-testid="start-plan-back"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <h1 className="flex-1 truncate text-lg font-bold text-foreground" data-testid="start-plan-name">
            {plan.name}
          </h1>
        </div>

        {/* Start date picker */}
        {startDate && preferenceApplied && (
          <div className="relative" data-testid="start-date-row">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <Icon name="event" size={18} color="var(--color-primary)" />
              <span className="flex-1 text-[13px] text-foreground">
                {t('targetPlan.planStartsOn')}{' '}
                <span className="font-semibold">
                  {startDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>
              <Icon
                name={showDatePicker ? 'expand_less' : 'expand_more'}
                size={20}
                color="var(--color-muted-foreground)"
              />
            </button>
            {showDatePicker && (
              <div className="absolute left-0 top-full z-50 mt-1">
                <CalendarPopover
                  selectedDate={startDate}
                  onSelect={handleDateSelect}
                  onClose={() => setShowDatePicker(false)}
                  minDate={minDate}
                />
              </div>
            )}
          </div>
        )}

        {/* Week navigation */}
        {preferenceApplied && weekStarts.length > 1 && (
          <div className="flex items-center justify-center gap-3" data-testid="week-navigation">
            <button
              type="button"
              disabled={currentWeekIndex === 0}
              onClick={() => setCurrentWeekIndex((i) => i - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span className="text-[13px] text-muted-foreground" data-testid="week-indicator">
              {weekLabel} · {t('targetPlan.weekIndicator', { current: currentWeekIndex + 1, total: weekStarts.length })}
            </span>
            <button
              type="button"
              disabled={currentWeekIndex === weekStarts.length - 1}
              onClick={() => setCurrentWeekIndex((i) => i + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Calendar grid */}
      {preferenceApplied && weekDates.length > 0 && (
        <StartPlanCalendarGrid
          weekDates={weekDates}
          planTasks={weekTasks}
          onTaskClick={handleTaskClick}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* Waiting for preference — show loading state */}
      {!preferenceApplied && !showPreferenceModal && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Bottom bar */}
      {preferenceApplied && scheduledTasks.length > 0 && (
        <div className="flex shrink-0 items-center justify-end gap-3 bg-background px-4 py-2.5" data-testid="confirm-bar">
          <button
            type="button"
            onClick={() => navigate(`/plans/${planId}`)}
            className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            data-testid="start-plan-cancel"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={executing}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            data-testid="confirm-create-tasks"
          >
            {executing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <Icon name="check" size={16} color="var(--color-primary-foreground)" />
                {t('targetPlan.confirmCreateTasks', 'Confirm & Create Tasks')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Time preference modal */}
      <TimePreferenceModal
        open={showPreferenceModal}
        onClose={handlePreferenceClose}
        onConfirm={handlePreferenceConfirm}
        showSpreadOption={showSpreadOption}
      />

      {/* Template detail panel */}
      {selectedTemplate !== null && templates[selectedTemplate.index] && (
        <PlanTemplateDetailPanel
          template={templates[selectedTemplate.index]}
          scheduledDate={selectedTemplate.date ?? scheduledDates[selectedTemplate.index]}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
