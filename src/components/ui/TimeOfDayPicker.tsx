/**
 * TimeOfDayPicker — popover for selecting time-of-day (Morning / Afternoon / Evening / At time).
 *
 * Adapted from dooooApp's GlassTimeOfDayPicker.
 * Selecting Morning/Afternoon/Evening sets virtual time (no exact time).
 * Selecting "At time" triggers the exact time picker.
 */

import { useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

export type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | null;

const OPTIONS: { value: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'AT_TIME'; icon: string; i18nKey: string }[] = [
  { value: 'MORNING', icon: 'wb_sunny', i18nKey: 'tasks.timeOfDay.morning' },
  { value: 'AFTERNOON', icon: 'wb_cloudy', i18nKey: 'tasks.timeOfDay.afternoon' },
  { value: 'EVENING', icon: 'nightlight', i18nKey: 'tasks.timeOfDay.evening' },
  { value: 'AT_TIME', icon: 'schedule', i18nKey: 'tasks.timeOfDay.atTime' },
];

interface TimeOfDayPickerProps {
  selectedTimeOfDay: TimeOfDay;
  onSelect: (value: TimeOfDay) => void;
  onAtTimePress: () => void;
  onClose: () => void;
}

export function TimeOfDayPicker({ selectedTimeOfDay, onSelect, onAtTimePress, onClose }: TimeOfDayPickerProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handlePress = (value: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'AT_TIME') => {
    if (value === 'AT_TIME') {
      onAtTimePress();
    } else {
      onSelect(value);
    }
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-56 rounded-(--radius-modal) border border-(--el-popover-border) bg-(--el-popover-bg) shadow-(--shadow-elevated)"
    >
      <div className="py-1">
        {OPTIONS.map((option) => {
          const isSelected = option.value !== 'AT_TIME' && option.value === selectedTimeOfDay;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePress(option.value)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-(--el-popover-item-hover) ${
                isSelected ? 'text-(--el-popover-check)' : 'text-(--el-popover-item-text)'
              }`}
            >
              <Icon
                name={option.icon}
                size={18}
                color={isSelected ? 'var(--el-popover-check)' : undefined}
              />
              <span className={`flex-1 text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                {t(option.i18nKey)}
              </span>
              {isSelected && <Icon name="check" size={18} color="var(--el-popover-check)" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
