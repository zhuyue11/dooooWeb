import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import type { PlanExecution } from '@/types/target';

interface PlanExecutionViewProps {
  execution: PlanExecution;
}

type FlatItem = {
  key: string;
  title: string;
  date: Date;
  isCompleted: boolean;
  type: 'task' | 'event';
};

export function PlanExecutionView({ execution }: PlanExecutionViewProps) {
  const { t } = useTranslation();

  const { completedCount, totalCount } = execution;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const pct = Math.round(progress * 100);

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];

    for (const task of execution.tasks) {
      if (task.isRecurring && task.totalOccurrences && task.date) {
        const startDate = new Date(task.date);
        for (let i = 0; i < task.totalOccurrences; i++) {
          const occDate = new Date(startDate);
          occDate.setDate(occDate.getDate() + i);
          items.push({
            key: `${task.id}-${i}`,
            title: task.title,
            date: occDate,
            isCompleted: i < task.completedInstances,
            type: 'task',
          });
        }
      } else {
        items.push({
          key: task.id,
          title: task.title,
          date: task.date ? new Date(task.date) : new Date(),
          isCompleted: task.isCompleted,
          type: 'task',
        });
      }
    }

    for (const event of execution.events) {
      items.push({
        key: event.id,
        title: event.title,
        date: event.date ? new Date(event.date) : new Date(),
        isCompleted: false,
        type: 'event',
      });
    }

    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    return items;
  }, [execution]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    [],
  );

  const todayStr = new Date().toDateString();
  let lastDateLabel = '';

  return (
    <div className="flex flex-col gap-4" data-testid="plan-execution-view">
      {/* Progress section */}
      <div data-testid="plan-execution-progress">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[15px] font-bold text-foreground">{t('targetPlan.progress')}</span>
          <span className="text-[13px] font-semibold text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemax={totalCount}
          />
        </div>
      </div>

      {/* Activities list */}
      <div data-testid="plan-activities-list">
        <span className="mb-3 block text-[15px] font-bold text-foreground">
          {t('targetPlan.activities')}
        </span>

        <div className="flex flex-col">
          {flatItems.map((item) => {
            const dateLabel = dateFormatter.format(item.date);
            const showDateHeader = dateLabel !== lastDateLabel;
            lastDateLabel = dateLabel;
            const isToday = item.date.toDateString() === todayStr;

            return (
              <div key={item.key}>
                {showDateHeader && (
                  <div className={`pb-1 pt-3 text-[13px] font-semibold first:pt-0 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isToday ? t('tasks.item.today') : dateLabel}
                  </div>
                )}
                <div className="flex items-center gap-2.5 py-1.5">
                  <Icon
                    name={
                      item.type === 'event'
                        ? 'event'
                        : item.isCompleted
                          ? 'check_circle'
                          : 'radio_button_unchecked'
                    }
                    size={18}
                    color={
                      item.isCompleted
                        ? '#10B981'
                        : 'var(--color-muted-foreground)'
                    }
                  />
                  <span
                    className={`text-[14px] ${
                      item.isCompleted
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
