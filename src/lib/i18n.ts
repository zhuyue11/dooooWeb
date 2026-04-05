import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files — same as dooooApp
// Tier 1
import en from '@/locales/en/translation.json';
import zh from '@/locales/zh/translation.json';
import es from '@/locales/es/translation.json';
import fr from '@/locales/fr/translation.json';
import de from '@/locales/de/translation.json';
import ja from '@/locales/ja/translation.json';
import ko from '@/locales/ko/translation.json';
import pt from '@/locales/pt/translation.json';
import ru from '@/locales/ru/translation.json';
import ar from '@/locales/ar/translation.json';
// Tier 2
import it from '@/locales/it/translation.json';
import tr from '@/locales/tr/translation.json';
import pl from '@/locales/pl/translation.json';
import nl from '@/locales/nl/translation.json';
import th from '@/locales/th/translation.json';
import vi from '@/locales/vi/translation.json';
import id from '@/locales/id/translation.json';
import fa from '@/locales/fa/translation.json';

// Detect browser language (web equivalent of expo-localization)
const browserLanguage = navigator.language.split('-')[0] || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      // Tier 1
      en: { translation: en },
      zh: { translation: zh },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ja: { translation: ja },
      ko: { translation: ko },
      pt: { translation: pt },
      ru: { translation: ru },
      ar: { translation: ar },
      // Tier 2
      it: { translation: it },
      tr: { translation: tr },
      pl: { translation: pl },
      nl: { translation: nl },
      th: { translation: th },
      vi: { translation: vi },
      id: { translation: id },
      fa: { translation: fa },
    },
    lng: localStorage.getItem('@doooo_language') || browserLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
