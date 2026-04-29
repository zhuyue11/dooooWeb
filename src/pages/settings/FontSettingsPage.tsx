import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFont } from '@/lib/contexts/font-context';
import { Icon } from '@/components/ui/Icon';
import { FONT_SIZES, FONT_SIZE_SCALE, buildGoogleFontsUrl, type FontSize } from '@/lib/font-config';

/* ─── Section label (same pattern as ThemeSettingsPage) ─────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-(--el-settings-label)">
      {children}
    </p>
  );
}

/* ─── Font size labels ─────────────────────────────────────────────── */

const SIZE_LABELS: Record<FontSize, string> = {
  xs: 'fontSettings.sizeExtraSmall',
  sm: 'fontSettings.sizeSmall',
  md: 'fontSettings.sizeMedium',
  lg: 'fontSettings.sizeLarge',
  xl: 'fontSettings.sizeExtraLarge',
};

/* ─── Font Family Section ──────────────────────────────────────────── */

function FontFamilySection() {
  const { t } = useTranslation();
  const { currentFontId, fontOptions, selectFont } = useFont();

  // Preload all Google Fonts for current language so cards render live previews
  useEffect(() => {
    const url = buildGoogleFontsUrl(fontOptions);
    if (!url) return;

    const link = document.createElement('link');
    link.id = 'doooo-google-font-preview';
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);

    return () => {
      link.remove();
    };
  }, [fontOptions]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel>{t('fontSettings.fontFamilyTitle')}</SectionLabel>
        <p className="mt-0.5 text-xs text-(--el-settings-label)">{t('fontSettings.fontFamilySubtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fontOptions.map((font) => {
          const isSelected = font.id === currentFontId;

          return (
            <button
              key={font.id}
              type="button"
              data-testid={`font-${font.id}`}
              onClick={() => selectFont(font.id)}
              className={[
                'flex flex-col gap-2 rounded-(--radius-card) p-(--spacing-card) text-left transition-colors',
                isSelected
                  ? 'border-2 border-(--el-settings-selected-border) bg-(--el-settings-selected-bg)'
                  : 'border border-(--el-settings-unselected-border) hover:bg-(--el-settings-hover)',
              ].join(' ')}
            >
              {/* Live preview text rendered in this font */}
              <div
                className="min-h-[48px] text-2xl leading-tight text-(--el-page-text)"
                style={font.cssFamily ? { fontFamily: font.cssFamily } : undefined}
              >
                {t('fontSettings.sampleText')}
              </div>

              {/* Font name + check icon */}
              <div className="flex items-center gap-1.5">
                {isSelected && (
                  <Icon name="check" size={14} className="text-(--el-settings-check)" weight={700} />
                )}
                <span className={`text-xs ${isSelected ? 'font-bold' : 'font-semibold'} text-(--el-page-text)`}>
                  {font.isSystemDefault ? t('fontSettings.systemDefault') : font.displayName}
                </span>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}

/* ─── Font Size Section ────────────────────────────────────────────── */

function FontSizeSection() {
  const { t } = useTranslation();
  const { fontSize, setFontSize } = useFont();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel>{t('fontSettings.fontSizeTitle')}</SectionLabel>
        <p className="mt-0.5 text-xs text-(--el-settings-label)">{t('fontSettings.fontSizeSubtitle')}</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {FONT_SIZES.map((size) => {
          const isSelected = fontSize === size;
          const scale = FONT_SIZE_SCALE[size];

          return (
            <button
              key={size}
              type="button"
              data-testid={`font-size-${size}`}
              onClick={() => setFontSize(size)}
              className={[
                'flex flex-col items-center gap-1.5 rounded-(--radius-card) px-2 py-3 transition-colors',
                isSelected
                  ? 'border-2 border-(--el-settings-selected-border) bg-(--el-settings-selected-bg)'
                  : 'border border-(--el-settings-unselected-border) hover:bg-(--el-settings-hover)',
              ].join(' ')}
            >
              {/* Size preview: "Aa" at the actual scale */}
              <span
                className="font-semibold text-(--el-page-text)"
                style={{ fontSize: `${scale * 1.25}rem` }}
              >
                Aa
              </span>
              <span className={`text-[10px] ${isSelected ? 'font-bold' : 'font-medium'} text-(--el-settings-label)`}>
                {t(SIZE_LABELS[size])}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}

/* ─── Main page ────────────────────────────────────────────────────── */

export function FontSettingsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-(--el-page-text)">
        {t('fontSettings.title')}
      </h1>

      {/* Font Family */}
      <div className="rounded-(--radius-card) border border-(--el-settings-border) bg-(--el-settings-bg) p-(--spacing-card)">
        <FontFamilySection />
      </div>

      {/* Font Size */}
      <div className="mt-4 rounded-(--radius-card) border border-(--el-settings-border) bg-(--el-settings-bg) p-(--spacing-card)">
        <FontSizeSection />
      </div>
    </div>
  );
}
