import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEYS } from '../config';

// Same supported languages as dooooApp
export type SupportedLanguage =
  | 'en' | 'zh' | 'es' | 'fr' | 'de'
  | 'ja' | 'ko' | 'pt' | 'ru' | 'ar'
  | 'it' | 'tr' | 'pl' | 'nl' | 'th'
  | 'vi' | 'id' | 'fa';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
];

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const RTL_LANGUAGES: SupportedLanguage[] = ['ar', 'fa'];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (stored) return stored as SupportedLanguage;
    // Use browser language if it's supported
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (SUPPORTED_LANGUAGES.some((l) => l.code === browserLang)) return browserLang;
    return 'en';
  });

  const isRTL = RTL_LANGUAGES.includes(language);

  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      setLanguageState(lang);
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
      i18n.changeLanguage(lang);
      // Update document direction for RTL languages
      document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
    },
    [i18n],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
