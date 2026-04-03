import { useTranslation } from 'react-i18next';
import { useTheme } from '@/lib/contexts/theme-context';
import type { ThemePattern } from '@/types/theme';

const PATTERNS: { value: ThemePattern; label: string }[] = [
  { value: 'auto', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeSettingsPage() {
  const { t } = useTranslation();
  const { themePattern, setThemePattern } = useTheme();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        {t('settings.theme', 'Theme')}
      </h1>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Appearance</p>
        <div className="flex gap-2">
          {PATTERNS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setThemePattern(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                themePattern === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
