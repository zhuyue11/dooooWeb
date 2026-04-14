import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import { useLanguage, type SupportedLanguage } from './language-context';

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';
export type TimeFormatSetting = 'auto' | '12h' | '24h';
export type WeekStartDay = 'sunday' | 'monday';

// Language → default time format map (matches dooooApp)
const TIME_FORMAT_BY_LANGUAGE: Record<SupportedLanguage, TimeFormat> = {
  en: '12h',
  zh: '24h',
  'zh-Hant': '24h',
  ja: '24h',
  ko: '12h',
  es: '24h',
  fr: '24h',
  de: '24h',
  pt: '24h',
  ru: '24h',
  it: '24h',
  nl: '24h',
  pl: '24h',
  tr: '24h',
  ar: '12h',
  fa: '24h',
  th: '24h',
  vi: '24h',
  id: '24h',
};

export function getResolvedTimeFormat(language: SupportedLanguage): TimeFormat {
  return TIME_FORMAT_BY_LANGUAGE[language] ?? '12h';
}

interface DisplayContextType {
  dateFormat: DateFormat;
  timeFormatSetting: TimeFormatSetting;
  timeFormat: TimeFormat; // resolved — never 'auto'
  weekStartDay: WeekStartDay;
  setDateFormat: (format: DateFormat) => void;
  setTimeFormat: (format: TimeFormatSetting) => void;
  setWeekStartDay: (day: WeekStartDay) => void;
}

const DisplayContext = createContext<DisplayContextType | null>(null);

export function DisplayProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();

  const [dateFormat, setDateFormatState] = useState<DateFormat>(
    () => (localStorage.getItem(STORAGE_KEYS.DATE_FORMAT) as DateFormat) || 'MM/DD/YYYY',
  );
  const [timeFormatSetting, setTimeFormatState] = useState<TimeFormatSetting>(
    () => (localStorage.getItem(STORAGE_KEYS.TIME_FORMAT) as TimeFormatSetting) || 'auto',
  );
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>(
    () => (localStorage.getItem(STORAGE_KEYS.WEEK_START_DAY) as WeekStartDay) || 'monday',
  );

  // Resolve 'auto' → actual format based on current language
  const timeFormat: TimeFormat = timeFormatSetting === 'auto'
    ? getResolvedTimeFormat(language)
    : timeFormatSetting;

  const setDateFormat = useCallback((format: DateFormat) => {
    setDateFormatState(format);
    localStorage.setItem(STORAGE_KEYS.DATE_FORMAT, format);
  }, []);

  const setTimeFormat = useCallback((format: TimeFormatSetting) => {
    setTimeFormatState(format);
    localStorage.setItem(STORAGE_KEYS.TIME_FORMAT, format);
  }, []);

  const setWeekStartDay = useCallback((day: WeekStartDay) => {
    setWeekStartDayState(day);
    localStorage.setItem(STORAGE_KEYS.WEEK_START_DAY, day);
  }, []);

  return (
    <DisplayContext.Provider value={{ dateFormat, timeFormatSetting, timeFormat, weekStartDay, setDateFormat, setTimeFormat, setWeekStartDay }}>
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
