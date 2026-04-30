import { useRef, useEffect } from 'react';
import { isSameDay, toISODate, getHoursArray, formatHourLabel } from '@/utils/date';
import { getCategoryColor } from '@/utils/category';
import { getSegmentForDay } from '@/utils/multiDay';
import { isItemChecked } from '@/hooks/useWeekCalendar';
import type { CalendarItem } from '@/hooks/useWeekCalendar';
import type { Category } from '@/types/api';
import { useDisplay } from '@/lib/contexts/display-context';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

export interface LayoutInfo { column: number; totalColumns: number; hidden: boolean; overflowCount: number }

const MAX_VISIBLE_COLS = 2;

/** Assign side-by-side columns to overlapping items (Google Calendar style).
 *  When `dayContext` is provided, multi-day items are clipped to that day's
 *  visible segment so overlap detection uses the correct time range. */
export function layoutOverlaps(items: CalendarItem[], maxVisibleCols: number = MAX_VISIBLE_COLS, dayContext?: Date): Map<string, LayoutInfo> {
  const result = new Map<string, LayoutInfo>();
  if (items.length === 0) return result;

  const spans = items.map((item) => {
    let start: number;
    let end: number;
    if (dayContext) {
      const seg = getSegmentForDay(item.date, item.duration || 60, dayContext);
      start = seg.visibleStart.getHours() * 60 + seg.visibleStart.getMinutes();
      end = start + seg.visibleMinutes;
    } else {
      const d = new Date(item.date);
      start = d.getHours() * 60 + d.getMinutes();
      end = start + (item.duration || 60);
    }
    return { id: item.id, start, end };
  }).sort((a, b) => a.start - b.start || a.end - b.end);

  // Greedy column assignment
  const columns: { id: string; end: number }[][] = [];
  for (const span of spans) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      if (columns[c][columns[c].length - 1].end <= span.start) {
        columns[c].push(span);
        result.set(span.id, { column: c, totalColumns: 0, hidden: false, overflowCount: 0 });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([span]);
      result.set(span.id, { column: columns.length - 1, totalColumns: 0, hidden: false, overflowCount: 0 });
    }
  }

  // Set totalColumns per overlap cluster, cap visible at MAX_VISIBLE_COLS
  for (const span of spans) {
    const overlapping = spans.filter(
      (other) => other.start < span.end && other.end > span.start,
    );
    const maxCol = Math.max(...overlapping.map((o) => result.get(o.id)!.column));
    const totalCols = maxCol + 1;
    for (const o of overlapping) {
      const info = result.get(o.id)!;
      info.totalColumns = Math.max(info.totalColumns, Math.min(totalCols, maxVisibleCols));
    }
  }

  // Mark items beyond MAX_VISIBLE_COLS as hidden and count overflow
  for (const span of spans) {
    const info = result.get(span.id)!;
    if (info.column >= maxVisibleCols) {
      info.hidden = true;
    }
  }

  // For each visible item in the last visible column, count how many hidden items overlap it
  for (const span of spans) {
    const info = result.get(span.id)!;
    if (info.hidden || info.column !== MAX_VISIBLE_COLS - 1) continue;
    const hiddenOverlapping = spans.filter((other) => {
      const otherInfo = result.get(other.id)!;
      return otherInfo.hidden && other.start < span.end && other.end > span.start;
    });
    info.overflowCount = hiddenOverlapping.length;
  }

  return result;
}

/** Shared row component for untimed item sections (all-day, morning, afternoon, evening). */
function UntimedRow({ icon, weekDates, getItems, categories, onItemClick, hourLabelWidth, hideGroupTag }: {
  icon?: string;
  weekDates: Date[];
  getItems: (dateKey: string) => CalendarItem[];
  categories?: Category[];
  onItemClick?: (item: CalendarItem) => void;
  hourLabelWidth: number;
  hideGroupTag?: boolean;
}) {
  return (
    <div className="flex" style={{ maxHeight: 60 }}>
      <div style={{ width: hourLabelWidth }} className="flex flex-shrink-0 items-start justify-end pr-2 pt-1">
        {icon && <Icon name={icon} size={10} className="text-(--el-cal-day-header)" />}
      </div>
      <div className="grid flex-1 grid-cols-7 border-b border-(--el-cal-grid-border)" style={{ maxHeight: 60, overflowY: 'auto' }}>
        {weekDates.map((date, i) => {
          const items = getItems(toISODate(date));
          return (
            <div key={i} className="flex flex-col gap-0.5 border-l border-(--el-cal-grid-border) px-0.5 py-1">
              {items.map((item) => {
                const colors = item.itemType === 'EVENT'
                  ? { bg: 'var(--el-cal-event-bg)', text: 'var(--el-cal-event-text)' }
                  : getCategoryColor(item.categoryId, categories);
                return (
                  <div
                    key={item.id}
                    data-testid={`task-card-${item.id}`}
                    className={`cursor-pointer overflow-hidden rounded px-1 py-0.5 transition-opacity hover:opacity-80 ${isItemChecked(item) ? 'opacity-60' : ''}`}
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                    onClick={() => onItemClick?.(item)}
                  >
                    <div className={`truncate text-[10px] font-medium leading-tight ${isItemChecked(item) ? 'line-through' : ''}`}>
                      {item.title}
                    </div>
                    {item.groupName && !hideGroupTag && (
                      <span className="mt-0.5 inline-flex max-w-full items-center gap-px truncate rounded-full border border-(--el-item-group-border) px-1 text-[7px] font-medium leading-tight text-(--el-item-group-text)">
                        <Icon name="group" size={7} color="var(--el-item-group-text)" />
                        {item.groupName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WeekGridProps {
  weekDates: Date[];
  itemsByDate: Map<string, CalendarItem[]>;
  selectedDate: Date | null;
  today: Date;
  categories?: Category[];
  onSelectDate: (date: Date) => void;
  onItemClick?: (item: CalendarItem) => void;
  isLoading: boolean;
  hideGroupTag?: boolean;
}

const SHORT_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const HOUR_HEIGHT = 60; // px per hour row
const HOUR_LABEL_WIDTH = 48; // px for hour label column

export function WeekGrid({ weekDates, itemsByDate, selectedDate, today, categories, onSelectDate, onItemClick, isLoading, hideGroupTag }: WeekGridProps) {
  const { t } = useTranslation();
  const { timeFormat } = useDisplay();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentHour = new Date().getHours();
  const hours = getHoursArray();

  // Auto-scroll to current time after loading completes
  useEffect(() => {
    if (!isLoading && scrollRef.current) {
      const now = new Date();
      const scrollTo = Math.max(0, (now.getHours() + now.getMinutes() / 60 - 1)) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [isLoading, weekDates[0]?.getTime()]);

  // Pre-process items per date: separate timed vs untimed, group untimed by timeOfDay
  const timedByDate = new Map<string, CalendarItem[]>();
  const noTodByDate = new Map<string, CalendarItem[]>(); // no timeOfDay
  const todByDate = new Map<string, Map<string, CalendarItem[]>>(); // keyed by timeOfDay
  for (const date of weekDates) {
    const key = toISODate(date);
    const items = itemsByDate.get(key) || [];
    timedByDate.set(key, items.filter((item) => item.hasTime));
    const untimed = items.filter((item) => !item.hasTime);
    noTodByDate.set(key, untimed.filter((item) => !item.timeOfDay));
    const todMap = new Map<string, CalendarItem[]>();
    for (const tod of ['MORNING', 'AFTERNOON', 'EVENING']) {
      const todItems = untimed.filter((item) => item.timeOfDay === tod);
      if (todItems.length > 0) todMap.set(tod, todItems);
    }
    todByDate.set(key, todMap);
  }

  const TIME_OF_DAY_SECTIONS = [
    { key: 'MORNING', icon: 'wb_sunny', i18nKey: 'tasks.timeOfDay.morning' },
    { key: 'AFTERNOON', icon: 'wb_cloudy', i18nKey: 'tasks.timeOfDay.afternoon' },
    { key: 'EVENING', icon: 'nightlight', i18nKey: 'tasks.timeOfDay.evening' },
  ];

  const hasAnyNoTod = weekDates.some((d) => (noTodByDate.get(toISODate(d))?.length ?? 0) > 0);

  return (
    <div
      data-testid="calendar-week-grid"
      className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-(--radius-card) bg-(--el-cal-grid-bg) shadow-(--shadow-card) lg:min-h-0"
    >
      {/* Day labels + date numbers header */}
      <div className="flex border-b border-(--el-cal-grid-border)">
        {/* Spacer for hour label column */}
        <div style={{ width: HOUR_LABEL_WIDTH }} className="flex-shrink-0" />
        {/* Day columns header */}
        <div className="grid flex-1 grid-cols-7">
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, today);
            const isSelected = selectedDate !== null && isSameDay(date, selectedDate);
            return (
              <div key={i} className="flex flex-col items-center py-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? 'text-(--el-cal-date-today-text)' : 'text-(--el-cal-day-header)'}`}>
                  <span className="hidden md:inline">{t(`calendarPage.weekdaysShort.${SHORT_DAY_KEYS[i]}`)}</span>
                  <span className="md:hidden">{t(`calendarPage.weekdaysNarrow.${SHORT_DAY_KEYS[i]}`)}</span>
                </span>
                <button
                  onClick={() => onSelectDate(date)}
                  className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-(--el-cal-date-selected-bg) text-(--el-cal-date-selected-text)'
                      : isToday
                        ? 'border-2 border-(--el-cal-date-today-border) text-(--el-cal-date-today-text)'
                        : 'text-(--el-cal-date-normal) hover:bg-(--el-cal-nav-hover-bg)'
                  }`}
                  data-testid={isToday ? 'today-indicator' : undefined}
                >
                  {date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Untimed sections — each is a row matching the time grid structure */}
      {hasAnyNoTod && (
        <UntimedRow
          weekDates={weekDates}
          getItems={(key) => noTodByDate.get(key) || []}
          categories={categories}
          onItemClick={onItemClick}
          hourLabelWidth={HOUR_LABEL_WIDTH}
          hideGroupTag={hideGroupTag}
        />
      )}
      {TIME_OF_DAY_SECTIONS.map((section) => {
        const hasItems = weekDates.some((d) => (todByDate.get(toISODate(d))?.get(section.key)?.length ?? 0) > 0);
        if (!hasItems) return null;
        return (
          <UntimedRow
            key={section.key}
            icon={section.icon}
            weekDates={weekDates}
            getItems={(key) => todByDate.get(key)?.get(section.key) || []}
            categories={categories}
            onItemClick={onItemClick}
            hourLabelWidth={HOUR_LABEL_WIDTH}
            hideGroupTag={hideGroupTag}
          />
        );
      })}

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-(--el-cal-hour-label)">{t('common.loading')}</div>
        ) : (
          <div className="relative flex">
            {/* Hour labels column */}
            <div className="flex-shrink-0" style={{ width: HOUR_LABEL_WIDTH }}>
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex items-start justify-end pr-2 pt-0"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className={`text-[10px] ${hour === currentHour ? 'font-semibold text-(--el-cal-hour-label-current)' : 'text-(--el-cal-hour-label)'}`}>
                    {formatHourLabel(hour, timeFormat)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns with hour rows */}
            <div className="grid flex-1 grid-cols-7">
              {weekDates.map((date, i) => {
                const dateKey = toISODate(date);
                const isToday = isSameDay(date, today);
                const timedItems = timedByDate.get(dateKey) || [];

                return (
                  <div
                    key={i}
                    data-testid={`day-column-${dateKey}`}
                    className="relative border-l border-(--el-cal-grid-border)"
                  >
                    {/* Hour row backgrounds */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        data-testid={i === 0 ? `hour-row-${hour}` : undefined}
                        className={`border-b border-(--el-cal-grid-border)/50 ${
                          isToday && hour === currentHour ? 'bg-(--el-cal-current-hour-bg)' : ''
                        }`}
                        style={{ height: HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Timed items — absolutely positioned, side-by-side for overlaps (max 2) */}
                    {(() => {
                      const layout = layoutOverlaps(timedItems, MAX_VISIBLE_COLS, date);
                      return timedItems.filter((item) => !layout.get(item.id)?.hidden).map((item) => {
                        // For multi-day items, clip start/duration to this day's visible segment
                        const segment = getSegmentForDay(item.date, item.duration || 60, date);
                        const startHour = segment.visibleStart.getHours();
                        const startMinute = segment.visibleStart.getMinutes();
                        const top = (startHour + startMinute / 60) * HOUR_HEIGHT;
                        const height = Math.max(24, (segment.visibleMinutes / 60) * HOUR_HEIGHT);
                        const colors = item.itemType === 'EVENT'
                          ? { bg: 'var(--el-cal-event-bg)', text: 'var(--el-cal-event-text)' }
                          : getCategoryColor(item.categoryId, categories);
                        const info = layout.get(item.id)!;
                        const col = info.column;
                        const total = info.totalColumns;
                        const widthPct = `${100 / total}%`;
                        const leftPct = `${(col / total) * 100}%`;

                        return (
                          <div
                            key={item.id}
                            data-testid={`task-card-${item.id}`}
                            className={`absolute cursor-pointer overflow-hidden rounded transition-opacity hover:opacity-80 ${isItemChecked(item) ? 'opacity-60' : ''}`}
                            style={{
                              top,
                              height,
                              left: leftPct,
                              width: widthPct,
                              backgroundColor: colors.bg,
                              padding: '2px 4px',
                              zIndex: 1,
                            }}
                            onClick={() => onItemClick?.(item)}
                          >
                            <div className="flex min-w-0 items-center gap-0.5">
                              {item.itemType === 'EVENT' && (
                                <Icon name="calendar_today" size={9} color={colors.text} />
                              )}
                              <span
                                className={`truncate text-[10px] font-medium leading-tight ${isItemChecked(item) ? 'line-through' : ''}`}
                                style={{ color: colors.text }}
                              >
                                {item.title}
                              </span>
                            </div>
                            {item.groupName && !hideGroupTag && (
                              <span className="mt-0.5 inline-flex max-w-full items-center gap-px truncate rounded-full border border-(--el-item-group-border) px-1 text-[7px] font-medium leading-tight text-(--el-item-group-text)">
                                <Icon name="group" size={7} color="var(--el-item-group-text)" />
                                {item.groupName}
                              </span>
                            )}
                            {info.overflowCount > 0 && (
                              <span className="mt-0.5 block text-[8px] font-medium text-(--el-cal-more-items)">
                                +{info.overflowCount} more
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
