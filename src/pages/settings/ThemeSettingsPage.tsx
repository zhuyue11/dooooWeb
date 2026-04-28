import { useTranslation } from 'react-i18next';
import {
  useTheme,
  THEME_COLORS,
  COLOR_PALETTES,
  THEME_COLOR_HEX,
  PALETTE_COLORS,
} from '@/lib/contexts/theme-context';
import { Icon } from '@/components/ui/Icon';
import type { ThemePattern, ThemeColor, ColorPalette } from '@/types/theme';

/* ─── Section label ─────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

/* ─── Mini Preview ──────────────────────────────────────────────────── */

function ThemeMiniPreview({ type }: { type: 'light' | 'dark' | 'split' }) {
  if (type === 'light') {
    return (
      <div className="flex h-[72px] flex-col gap-1.5 rounded-lg bg-[#f2f3f5] p-2.5">
        <div className="h-2 w-3/4 rounded bg-white" />
        <div className="h-2 flex-1 rounded bg-white" />
        <div className="h-2 w-2/5 rounded bg-[var(--color-primary)]" />
      </div>
    );
  }
  if (type === 'dark') {
    return (
      <div className="flex h-[72px] flex-col gap-1.5 rounded-lg bg-[#0f0f0f] p-2.5">
        <div className="h-2 w-3/4 rounded bg-[#1a1a1a]" />
        <div className="h-2 flex-1 rounded bg-[#1a1a1a]" />
        <div className="h-2 w-2/5 rounded bg-[var(--color-primary)]" />
      </div>
    );
  }
  return (
    <div className="flex h-[72px] overflow-hidden rounded-lg">
      <div className="flex-1 bg-[#f2f3f5]" />
      <div className="flex-1 bg-[#0f0f0f]" />
    </div>
  );
}

/* ─── Theme Pattern ─────────────────────────────────────────────────── */

const PATTERNS: { value: ThemePattern; icon: string; preview: 'light' | 'dark' | 'split' }[] = [
  { value: 'light', icon: 'light_mode', preview: 'light' },
  { value: 'dark', icon: 'dark_mode', preview: 'dark' },
  { value: 'auto', icon: 'routine', preview: 'split' },
  { value: 'system', icon: 'computer', preview: 'split' },
];

function ThemePatternSection() {
  const { t } = useTranslation();
  const { themePattern, setThemePattern, colorPalette } = useTheme();
  const isDisabled = !!colorPalette;

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>{t('themeSettings.themePattern')}</SectionLabel>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PATTERNS.map(({ value, icon, preview }) => {
          const isSelected = themePattern === value && !colorPalette;
          const labelKey = `themeSettings.pattern${value.charAt(0).toUpperCase() + value.slice(1)}`;

          return (
            <button
              key={value}
              type="button"
              data-testid={`pattern-${value}`}
              disabled={isDisabled}
              onClick={() => setThemePattern(value)}
              className={[
                'flex flex-col items-center gap-2 rounded-xl p-3 transition-colors',
                isSelected
                  ? 'border-2 border-primary bg-primary/5'
                  : 'border border-border hover:bg-muted',
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <ThemeMiniPreview type={preview} />
              <div className="flex items-center gap-1">
                <Icon name={icon} size={16} className="text-muted-foreground" />
                <span className={`text-xs ${isSelected ? 'font-bold' : 'font-medium'} text-foreground`}>
                  {t(labelKey)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {themePattern === 'auto' && !colorPalette && (
        <p className="text-xs text-muted-foreground">{t('themeSettings.autoDescription')}</p>
      )}
    </div>
  );
}

/* ─── Theme Color ───────────────────────────────────────────────────── */

function ThemeColorSection() {
  const { t } = useTranslation();
  const { themeColor, setThemeColor, colorPalette } = useTheme();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel>{t('themeSettings.themeColorTitle')}</SectionLabel>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('themeSettings.themeColorSubtitle')}</p>
      </div>
      <div className="grid grid-cols-5 gap-x-2 gap-y-3 sm:flex sm:flex-wrap sm:gap-4">
        {THEME_COLORS.map((color: ThemeColor) => {
          const isSelected = themeColor === color && !colorPalette;
          const hex = THEME_COLOR_HEX[color];
          const labelKey = `themeSettings.color${color.charAt(0).toUpperCase() + color.slice(1)}`;
          return (
            <button
              key={color}
              type="button"
              data-testid={`color-${color}`}
              onClick={() => setThemeColor(color)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full transition-shadow',
                  isSelected ? 'ring-2 ring-offset-2 ring-offset-surface' : '',
                ].join(' ')}
                style={{
                  backgroundColor: hex,
                  boxShadow: isSelected ? `0 0 0 2px ${hex}` : undefined,
                }}
              >
                {isSelected && (
                  <Icon name="check" size={16} className="text-white" weight={700} />
                )}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Color Palettes ────────────────────────────────────────────────── */

function ColorPaletteSection() {
  const { t } = useTranslation();
  const { colorPalette, setColorPalette } = useTheme();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel>{t('themeSettings.colorPalettesTitle')}</SectionLabel>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('themeSettings.colorPalettesSubtitle')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {COLOR_PALETTES.map((palette: ColorPalette) => {
          const isSelected = colorPalette === palette;
          const colors = PALETTE_COLORS[palette];
          const labelKey = `themeSettings.palette${palette.charAt(0).toUpperCase() + palette.slice(1)}`;
          return (
            <button
              key={palette}
              type="button"
              data-testid={`palette-${palette}`}
              onClick={() => setColorPalette(isSelected ? null : palette)}
              className={[
                'flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors',
                isSelected
                  ? 'border-2 border-primary bg-primary/5'
                  : 'border border-border hover:bg-muted',
              ].join(' ')}
            >
              {/* Multi-color indicator */}
              <div className="flex -space-x-1">
                {[colors.primary, colors.secondary, colors.accent].map((c, i) => (
                  <div
                    key={i}
                    className="h-5 w-5 rounded-full border-2 border-surface"
                    style={{ backgroundColor: c, zIndex: 3 - i }}
                  />
                ))}
              </div>
              <span className={`text-xs ${isSelected ? 'font-bold' : 'font-semibold'} text-foreground`}>
                {t(labelKey)}
              </span>
              {isSelected && (
                <Icon name="check" size={16} className="ml-auto text-primary" weight={700} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────── */

export function ThemeSettingsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        {t('settings.theme', 'Theme')}
      </h1>

      {/* Pattern + Color — side by side at wider viewports */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <ThemePatternSection />
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <ThemeColorSection />
        </div>
      </div>

      {/* Palettes — full width below */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-5">
        <ColorPaletteSection />
      </div>
    </div>
  );
}
