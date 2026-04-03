import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';
export type WeekStartDay = 'sunday' | 'monday';

interface DisplayContextType {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartDay: WeekStartDay;
  setDateFormat: (format: DateFormat) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setWeekStartDay: (day: WeekStartDay) => void;
}

const DisplayContext = createContext<DisplayContextType | null>(null);

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [dateFormat, setDateFormatState] = useState<DateFormat>(
    () => (localStorage.getItem(STORAGE_KEYS.DATE_FORMAT) as DateFormat) || 'MM/DD/YYYY',
  );
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(
    () => (localStorage.getItem(STORAGE_KEYS.TIME_FORMAT) as TimeFormat) || '12h',
  );
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>(
    () => (localStorage.getItem(STORAGE_KEYS.WEEK_START_DAY) as WeekStartDay) || 'sunday',
  );

  const setDateFormat = useCallback((format: DateFormat) => {
    setDateFormatState(format);
    localStorage.setItem(STORAGE_KEYS.DATE_FORMAT, format);
  }, []);

  const setTimeFormat = useCallback((format: TimeFormat) => {
    setTimeFormatState(format);
    localStorage.setItem(STORAGE_KEYS.TIME_FORMAT, format);
  }, []);

  const setWeekStartDay = useCallback((day: WeekStartDay) => {
    setWeekStartDayState(day);
    localStorage.setItem(STORAGE_KEYS.WEEK_START_DAY, day);
  }, []);

  return (
    <DisplayContext.Provider value={{ dateFormat, timeFormat, weekStartDay, setDateFormat, setTimeFormat, setWeekStartDay }}>
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplay() {
  const context = useContext(DisplayContext);
  if (!context) {
    throw new Error('useDisplay must be used within a DisplayProvider');
  }
  return context;
}
