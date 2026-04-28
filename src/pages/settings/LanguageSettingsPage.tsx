import { useTranslation } from 'react-i18next';
import { useLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/contexts/language-context';

export function LanguageSettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        {t('settings.language', 'Language')}
      </h1>
      <div className="divide-y divide-border rounded-(--radius-card) border border-border bg-surface">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code as SupportedLanguage)}
            className={`flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted ${
              language === lang.code ? 'text-primary font-medium' : 'text-foreground'
            }`}
          >
            <span>{lang.nativeName}</span>
            <span className="text-muted-foreground">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
