import { useTranslation } from 'react-i18next';
import { useLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/contexts/language-context';

export function LanguageSettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-(--el-page-text)">
        {t('settings.language', 'Language')}
      </h1>
      <div className="divide-y divide-(--el-settings-border) rounded-(--radius-card) border border-(--el-settings-border) bg-(--el-settings-bg)">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code as SupportedLanguage)}
            className={`flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-(--el-settings-hover) ${
              language === lang.code ? 'text-(--el-settings-check) font-medium' : 'text-(--el-page-text)'
            }`}
          >
            <span>{lang.nativeName}</span>
            <span className="text-(--el-settings-label)">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
