import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useDisplay } from '@/lib/contexts/display-context';
import type { PlanTemplate } from '@/types/target';
import type { Repeat } from '@/types/api';

interface PlanTemplateItemProps {
  template: PlanTemplate;
  index: number;
  scheduledDate?: Date;
  onClick?: () => void;
}

function formatRepeatLabel(repeatJson: string, t: (key: string, opts?: Record<string, unknown>) => string): string | null {
  try {
    const repeat: Repeat = JSON.parse(repeatJson);
    const interval = repeat.interval || 1;

    if (repeat.type === 'weekly' && repeat.weekdays && repeat.weekdays.length > 0) {
      const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const sorted = [...repeat.weekdays].sort((a, b) => ((a || 7) - (b || 7)));
      const names = sorted.map(d => t(`tasks.input.panel.weekdays.${dayKeys[d]}`));
      const base = names.join(', ');
      if (interval > 1) {
        return `${base} · ${t('tasks.input.everyInterval', { interval, period: t('tasks.input.panel.weeks') })}`;
      }
      return base;
    }

    if (interval === 1) {
      const labels: Record<string, string> = {
        daily: t('tasks.input.everyDay'),
        weekly: t('tasks.input.everyWeek'),
        monthly: t('tasks.input.everyMonth'),
        yearly: t('tasks.input.everyYear'),
      };
      return labels[repeat.type] || null;
    }

    const plural: Record<string, string> = {
      daily: t('tasks.input.panel.days'),
      weekly: t('tasks.input.panel.weeks'),
      monthly: t('tasks.input.panel.months'),
      yearly: t('tasks.input.panel.years'),
    };
    return t('tasks.input.everyInterval', {
      interval,
      period: plural[repeat.type] || t('tasks.input.panel.days'),
    });
  } catch {
    return null;
  }
}

function formatOccurrences(repeatJson: string): string | null {
  try {
    const repeat: Repeat = JSON.parse(repeatJson);
    if (repeat.endCondition?.type === 'count' && repeat.endCondition.occurrences) {
      return `\u00d7${repeat.endCondition.occurrences}`;
    }
    return null;
  } catch {
    return null;
  }
}

function formatTime(time: string, timeFormat: '12h' | '24h' = '12h'): string {
  const [h, m] = time.split(':').map(Number);
  if (timeFormat === '24h') {
    return m === 0 ? `${h}:00` : `${h}:${m.toString().padStart(2, '0')}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatScheduledDate(date: Date, t: (key: string) => string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return t('tasks.item.today');
  if (target.getTime() === tomorrow.getTime()) return t('tasks.item.tomorrow');
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function PlanTemplateItem({ template, index, scheduledDate, onClick }: PlanTemplateItemProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();
  const isEvent = template.type === 'event';

  return (
    <div
      className={`flex items-center gap-3 rounded-(--radius-card) border border-(--el-card-border) bg-(--el-plan-bg) px-(--spacing-card) py-3.5${onClick ? ' cursor-pointer transition-all duration-(--transition-duration) hover:shadow-(--shadow-card-hover)' : ''}`}
      data-testid={`plan-template-item-${index}`}
      onClick={onClick}
    >
      {/* Order badge */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--el-target-status-active-bg)">
        <span className="text-[13px] font-bold text-(--el-target-status-active-text)">{index + 1}</span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-1">
          {isEvent && <Icon name="event" size={15} color="var(--el-target-chevron)" />}
          <span className="text-[15px] font-semibold text-(--el-plan-title)">{template.title}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {template.time && (
            <div className="flex items-center gap-1">
              <Icon name="schedule" size={12} color="var(--el-target-status-active-text)" />
              <span className="text-xs font-medium text-(--el-target-status-active-text)">{formatTime(template.time, timeFormat)}</span>
            </div>
          )}

          {scheduledDate && (
            <div className="flex items-center gap-1">
              <Icon name="event" size={12} color="var(--el-target-status-active-text)" />
              <span className="text-xs font-medium text-(--el-target-status-active-text)">
                {formatScheduledDate(scheduledDate, t)}
              </span>
            </div>
          )}

          {template.gapDays > 0 && (
            <div className="flex items-center gap-1">
              <Icon name="schedule" size={12} color="var(--el-plan-description)" />
              <span className="text-xs text-(--el-plan-description)">+{template.gapDays}d</span>
            </div>
          )}

          {template.repeat && (
            <div className="flex items-center gap-1">
              <Icon name="repeat" size={12} color="var(--el-plan-description)" />
              <span className="text-xs text-(--el-plan-description)">
                {formatRepeatLabel(template.repeat, t) || t('tasks.input.repeat')}
                {formatOccurrences(template.repeat) ? ` ${formatOccurrences(template.repeat)}` : ''}
              </span>
            </div>
          )}

          {template.duration != null && template.duration > 0 && (
            <div className="flex items-center gap-1">
              <Icon name="timer" size={12} color="var(--el-plan-description)" />
              <span className="text-xs text-(--el-plan-description)">{formatDuration(template.duration)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
