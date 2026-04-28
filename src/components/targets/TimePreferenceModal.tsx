import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { TimePreference, ScheduleMode } from '@/utils/planScheduler';

interface TimePreferenceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: ScheduleMode, preference: TimePreference, useTimeOfDay: boolean) => void;
  showSpreadOption: boolean;
}

type Step = 'spread_or_period' | 'pick_period' | 'schedule_precision';

const PERIOD_LABELS: Record<TimePreference, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export function TimePreferenceModal({ open, onClose, onConfirm, showSpreadOption }: TimePreferenceModalProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>(showSpreadOption ? 'spread_or_period' : 'pick_period');
  const [pendingMode, setPendingMode] = useState<ScheduleMode>('spread');
  const [pendingPreference, setPendingPreference] = useState<TimePreference>('morning');
  const [previousStep, setPreviousStep] = useState<'spread_or_period' | 'pick_period'>(
    showSpreadOption ? 'spread_or_period' : 'pick_period',
  );

  // Reset step when modal opens or showSpreadOption changes
  useEffect(() => {
    if (open) {
      setStep(showSpreadOption ? 'spread_or_period' : 'pick_period');
      setPreviousStep(showSpreadOption ? 'spread_or_period' : 'pick_period');
      setPendingMode('spread');
      setPendingPreference('morning');
    }
  }, [open, showSpreadOption]);

  const handleSpreadChoice = (choice: 'spread' | 'same_period') => {
    if (choice === 'spread') {
      setPendingMode('spread');
      setPendingPreference('morning');
      setPreviousStep('spread_or_period');
      setStep('schedule_precision');
    } else {
      setStep('pick_period');
    }
  };

  const handlePeriodChoice = (preference: TimePreference) => {
    setPendingMode('same_period');
    setPendingPreference(preference);
    setPreviousStep('pick_period');
    setStep('schedule_precision');
  };

  const handleSchedulePrecision = (useTimeOfDay: boolean) => {
    onConfirm(pendingMode, pendingPreference, useTimeOfDay);
  };

  const handleClose = () => {
    setStep(showSpreadOption ? 'spread_or_period' : 'pick_period');
    setPendingMode('spread');
    setPendingPreference('morning');
    onClose();
  };

  const getTimeOfDayLabel = (): string => {
    if (pendingMode === 'spread') {
      return t('targetPlan.justSpreadNoExactTime', 'Just Morning / Afternoon / Evening, no exact time');
    }
    const periodLabel = t(`targetPlan.${pendingPreference}`, PERIOD_LABELS[pendingPreference]);
    return t('targetPlan.justPeriodNoExactTime', { period: periodLabel, defaultValue: 'Just {{period}}, no exact time' });
  };

  const getTimeOfDayDescription = (): string => {
    if (pendingMode === 'spread') {
      return t('targetPlan.justSpreadNoExactTimeDesc', 'Tasks show under their time period without being pinned to a specific hour');
    }
    const periodLabel = t(`targetPlan.${pendingPreference}`, PERIOD_LABELS[pendingPreference]);
    return t('targetPlan.justPeriodNoExactTimeDesc', { period: periodLabel, defaultValue: 'Tasks show under {{period}} without being pinned to a specific hour' });
  };

  const periodOptions: { key: TimePreference; icon: string; label: string; description: string }[] = [
    {
      key: 'morning',
      icon: 'wb_sunny',
      label: t('targetPlan.morning', 'Morning'),
      description: t('targetPlan.morningRange', '6 AM – 12 PM'),
    },
    {
      key: 'afternoon',
      icon: 'wb_cloudy',
      label: t('targetPlan.afternoon', 'Afternoon'),
      description: t('targetPlan.afternoonRange', '12 PM – 6 PM'),
    },
    {
      key: 'evening',
      icon: 'nights_stay',
      label: t('targetPlan.evening', 'Evening'),
      description: t('targetPlan.eveningRange', '6 PM – 12 AM'),
    },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center" data-testid="time-preference-modal">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-(--el-modal-overlay) animate-backdrop-in"
        onClick={handleClose}
      />

      {/* Modal card */}
      <div className="relative z-10 mx-4 w-full max-w-md animate-modal-enter rounded-(--radius-card) bg-(--el-modal-bg) p-(--spacing-card) shadow-(--shadow-elevated)">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-(--el-plan-description) hover:bg-(--el-popover-item-hover)"
          data-testid="time-pref-close"
        >
          <Icon name="close" size={20} />
        </button>

        {step === 'spread_or_period' && (
          <div className="flex flex-col gap-4" data-testid="step-spread-or-period">
            <h2 className="pr-8 text-lg font-bold text-(--el-modal-title-text)">
              {t('targetPlan.multipleTasksSameDay', 'You have multiple tasks on the same day')}
            </h2>
            <p className="text-sm text-(--el-plan-description)">
              {t('targetPlan.spreadOrSamePeriod', 'How would you like to schedule them?')}
            </p>

            <button
              type="button"
              className="flex items-center gap-3 rounded-(--radius-card) border border-(--el-card-border) p-(--spacing-card) text-left transition-colors hover:bg-(--el-popover-item-hover)"
              onClick={() => handleSpreadChoice('spread')}
              data-testid="option-spread"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--el-target-status-active-bg)">
                <Icon name="view_day" size={22} color="var(--el-target-chevron)" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-(--el-modal-title-text)">
                  {t('targetPlan.spreadThroughDay', 'Spread throughout the day')}
                </span>
                <span className="text-xs text-(--el-plan-description)">
                  {t('targetPlan.spreadDescription', 'Distribute tasks across morning, afternoon, and evening')}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="flex items-center gap-3 rounded-(--radius-card) border border-(--el-card-border) p-(--spacing-card) text-left transition-colors hover:bg-(--el-popover-item-hover)"
              onClick={() => handleSpreadChoice('same_period')}
              data-testid="option-same-period"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--el-target-status-active-bg)">
                <Icon name="schedule" size={22} color="var(--el-target-chevron)" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-(--el-modal-title-text)">
                  {t('targetPlan.samePeriod', 'Keep in the same time period')}
                </span>
                <span className="text-xs text-(--el-plan-description)">
                  {t('targetPlan.samePeriodDescription', 'Choose a preferred time of day for all tasks')}
                </span>
              </div>
            </button>
          </div>
        )}

        {step === 'pick_period' && (
          <div className="flex flex-col gap-4" data-testid="step-pick-period">
            <h2 className="pr-8 text-lg font-bold text-(--el-modal-title-text)">
              {t('targetPlan.whenPreferTasks', 'When do you prefer to do your tasks?')}
            </h2>

            {periodOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className="flex items-center gap-3 rounded-(--radius-card) border border-(--el-card-border) p-(--spacing-card) text-left transition-colors hover:bg-(--el-popover-item-hover)"
                onClick={() => handlePeriodChoice(option.key)}
                data-testid={`period-${option.key}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--el-target-status-active-bg)">
                  <Icon name={option.icon} size={24} color="var(--el-target-chevron)" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-(--el-modal-title-text)">{option.label}</span>
                  <span className="text-xs text-(--el-plan-description)">{option.description}</span>
                </div>
                <Icon name="chevron_right" size={20} color="var(--el-plan-description)" />
              </button>
            ))}

            {showSpreadOption && (
              <button
                type="button"
                className="mt-1 flex items-center gap-1.5 self-start text-sm text-(--el-plan-description) hover:text-(--el-plan-title)"
                onClick={() => setStep('spread_or_period')}
                data-testid="time-pref-back"
              >
                <Icon name="arrow_back" size={16} />
                {t('common.back', 'Back')}
              </button>
            )}
          </div>
        )}

        {step === 'schedule_precision' && (
          <div className="flex flex-col gap-4" data-testid="step-schedule-precision">
            <h2 className="pr-8 text-lg font-bold text-(--el-modal-title-text)">
              {t('targetPlan.howToSchedule', 'How would you like to schedule?')}
            </h2>

            <button
              type="button"
              className="flex items-center gap-3 rounded-(--radius-card) border border-(--el-card-border) p-(--spacing-card) text-left transition-colors hover:bg-(--el-popover-item-hover)"
              onClick={() => handleSchedulePrecision(false)}
              data-testid="option-specific-times"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--el-target-status-active-bg)">
                <Icon name="schedule" size={22} color="var(--el-target-chevron)" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-(--el-modal-title-text)">
                  {t('targetPlan.scheduleSpecificTimes', 'Schedule at specific times')}
                </span>
                <span className="text-xs text-(--el-plan-description)">
                  {t('targetPlan.scheduleSpecificTimesDesc', 'Auto-assign times based on availability')}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="flex items-center gap-3 rounded-(--radius-card) border border-(--el-card-border) p-(--spacing-card) text-left transition-colors hover:bg-(--el-popover-item-hover)"
              onClick={() => handleSchedulePrecision(true)}
              data-testid="option-time-of-day"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--el-target-status-active-bg)">
                <Icon name="wb_twilight" size={22} color="var(--el-target-chevron)" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-(--el-modal-title-text)">
                  {getTimeOfDayLabel()}
                </span>
                <span className="text-xs text-(--el-plan-description)">
                  {getTimeOfDayDescription()}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="mt-1 flex items-center gap-1.5 self-start text-sm text-(--el-plan-description) hover:text-(--el-plan-title)"
              onClick={() => setStep(previousStep)}
              data-testid="time-pref-back"
            >
              <Icon name="arrow_back" size={16} />
              {t('common.back', 'Back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
