import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import type { ThemePattern, ThemeColor, ColorPalette, DisplayStyle } from '@/types/theme';

/**
 * Three-tier theme provider + Display Style — ported from dooooHub/dooooApp.
 *
 * Tier 1 — ThemePattern: system | auto | light | dark
 *   • applies via data-theme="light|dark" on <html>
 *
 * Tier 2 — ThemeColor: 9 primary colors
 *   • changes --color-primary, --color-secondary, --color-accent only
 *   • applies via data-color="ocean" on <html>
 *
 * Tier 3 — ColorPalette: full themed presets (ocean, crimson, etc.)
 *   • overrides ALL color tokens (surfaces, text, borders, brand, status)
 *   • applies via data-palette="ocean" on <html>
 *   • Fixed-scheme palettes: data-theme is removed (palette controls everything)
 *   • Schemeable palettes (airbnb, clay, notion, starbucks, mintlify):
 *     data-theme is KEPT so ThemePattern still controls light/dark
 *
 * Display Style — independent axis controlling shape/personality
 *   • applies via data-display-style="notion" on <html>
 *   • overrides shape, spacing, shadow, border, interaction tokens
 *   • works with ANY color palette or tier 1/2 combination
 *
 * Priority: palette > (pattern + color) for colors; display style is orthogonal
 */

export const THEME_COLORS: ThemeColor[] = ['electric', 'emerald', 'ocean', 'crimson', 'amber', 'yellow', 'cyan', 'purple', 'pink'];
export const COLOR_PALETTES: ColorPalette[] = ['light', 'dark', 'ocean', 'crimson', 'amber', 'yellow', 'cyan', 'purple', 'pink', 'airbnb', 'clay', 'notion', 'starbucks', 'mintlify'];
export const DISPLAY_STYLES: DisplayStyle[] = ['default', 'soft', 'flat', 'pill'];

/** Brand-inspired palettes that support both light and dark via ThemePattern. */
export const SCHEMEABLE_PALETTES: ReadonlySet<ColorPalette> = new Set(['airbnb', 'clay', 'notion', 'starbucks', 'mintlify']);

/** Hex values for each ThemeColor (light mode primary). Used for UI swatches. */
export const THEME_COLOR_HEX: Record<ThemeColor, string> = {
  electric: '#360EFF',
  emerald: '#10B981',
  ocean: '#0EA5E9',
  crimson: '#EF4444',
  amber: '#F59E0B',
  yellow: '#EAB308',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
};

/** Representative colors for each palette (for preview chips in settings UI). */
export const PALETTE_COLORS: Record<ColorPalette, { primary: string; secondary: string; accent: string; bg: string }> = {
  light: { primary: '#360EFF', secondary: '#7C3AED', accent: '#F59E0B', bg: '#F2F3F5' },
  dark: { primary: '#818CF8', secondary: '#A78BFA', accent: '#FBBF24', bg: '#0F0F0F' },
  ocean: { primary: '#3B82F6', secondary: '#14B8A6', accent: '#F97316', bg: '#F0F7FF' },
  crimson: { primary: '#DC2626', secondary: '#B91C1C', accent: '#F97316', bg: '#E5E5E5' },
  amber: { primary: '#EA580C', secondary: '#C2410C', accent: '#EA580C', bg: '#E5E5E5' },
  yellow: { primary: '#EDF060', secondary: '#D4C94F', accent: '#EDF060', bg: '#1A1A1A' },
  cyan: { primary: '#00FFFF', secondary: '#00D4D4', accent: '#00FFFF', bg: '#1A1A1A' },
  purple: { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#8B5CF6', bg: '#E5E5E5' },
  pink: { primary: '#EC4899', secondary: '#DB2777', accent: '#EC4899', bg: '#FDF2F8' },
  airbnb: { primary: '#FF385C', secondary: '#460479', accent: '#FF385C', bg: '#FFFFFF' },
  clay: { primary: '#FF4D8B', secondary: '#B8A4ED', accent: '#E8B94A', bg: '#FFFAF0' },
  notion: { primary: '#0075DE', secondary: '#213183', accent: '#2A9D99', bg: '#FFFFFF' },
  starbucks: { primary: '#006241', secondary: '#00754A', accent: '#CBA258', bg: '#F2F0EB' },
  mintlify: { primary: '#18E299', secondary: '#0FA76E', accent: '#3772CF', bg: '#FFFFFF' },
};

/** Preview data for display style UI cards. */
export const DISPLAY_STYLE_SHAPES: Record<DisplayStyle, { btnRadius: string; cardRadius: string; shadow: string }> = {
  default: { btnRadius: '8px', cardRadius: '12px', shadow: '0 1px 3px rgba(0,0,0,0.04)' },
  soft: { btnRadius: '8px', cardRadius: '14px', shadow: '0 2px 8px rgba(0,0,0,0.06)' },
  flat: { btnRadius: '12px', cardRadius: '16px', shadow: 'none' },
  pill: { btnRadius: '50px', cardRadius: '8px', shadow: '0 1px 2px rgba(0,0,0,0.03)' },
};

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  themePattern: ThemePattern;
  themeColor: ThemeColor;
  colorPalette: ColorPalette | null;
  displayStyle: DisplayStyle;
  /** Computed light/dark from pattern (or palette's inherent scheme). */
  colorScheme: ResolvedTheme;
  setThemePattern: (pattern: ThemePattern) => void;
  setThemeColor: (color: ThemeColor) => void;
  setColorPalette: (palette: ColorPalette | null) => void;
  setDisplayStyle: (style: DisplayStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const DEFAULT_PATTERN: ThemePattern = 'auto';
const DEFAULT_COLOR: ThemeColor = 'emerald';
const DEFAULT_DISPLAY_STYLE: DisplayStyle = 'default';

function readPattern(): ThemePattern {
  const raw = localStorage.getItem(STORAGE_KEYS.THEME_PATTERN);
  if (raw === 'light' || raw === 'dark' || raw === 'system' || raw === 'auto') return raw;
  return DEFAULT_PATTERN;
}

function readColor(): ThemeColor {
  const raw = localStorage.getItem(STORAGE_KEYS.THEME_COLOR);
  if (raw && THEME_COLORS.includes(raw as ThemeColor)) return raw as ThemeColor;
  return DEFAULT_COLOR;
}

function readPalette(): ColorPalette | null {
  const raw = localStorage.getItem(STORAGE_KEYS.COLOR_PALETTE);
  if (raw && COLOR_PALETTES.includes(raw as ColorPalette)) return raw as ColorPalette;
  return null;
}

function readDisplayStyle(): DisplayStyle {
  const raw = localStorage.getItem(STORAGE_KEYS.DISPLAY_STYLE);
  if (raw && (DISPLAY_STYLES as string[]).includes(raw)) return raw as DisplayStyle;
  return DEFAULT_DISPLAY_STYLE;
}

function resolvePattern(pattern: ThemePattern): ResolvedTheme {
  if (pattern === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (pattern === 'auto') {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  }
  return pattern;
}

function applyAttributes(resolved: ResolvedTheme, color: ThemeColor, palette: ColorPalette | null, displayStyle: DisplayStyle) {
  const el = document.documentElement;

  if (palette) {
    if (SCHEMEABLE_PALETTES.has(palette)) {
      // Schemeable palettes keep data-theme so CSS compound selectors work
      el.dataset.theme = resolved;
    } else {
      // Fixed-scheme palettes remove data-theme — palette controls color-scheme
      delete el.dataset.theme;
    }
    delete el.dataset.color;
    el.dataset.palette = palette;
  } else {
    el.dataset.theme = resolved;
    delete el.dataset.palette;
    // Only set data-color if not the default (emerald is the base CSS, no override needed)
    if (color === 'emerald') {
      delete el.dataset.color;
    } else {
      el.dataset.color = color;
    }
  }

  // Display style — independent of color system
  if (displayStyle === 'default') {
    delete el.dataset.displayStyle;
  } else {
    el.dataset.displayStyle = displayStyle;
  }

  // Remove legacy .dark class (migration from old system)
  el.classList.remove('dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePattern, setThemePatternState] = useState<ThemePattern>(DEFAULT_PATTERN);
  const [themeColor, setThemeColorState] = useState<ThemeColor>(DEFAULT_COLOR);
  const [colorPalette, setColorPaletteState] = useState<ColorPalette | null>(null);
  const [displayStyle, setDisplayStyleState] = useState<DisplayStyle>(DEFAULT_DISPLAY_STYLE);
  const [colorScheme, setColorScheme] = useState<ResolvedTheme>('light');

  // Initial load from localStorage
  useEffect(() => {
    const pattern = readPattern();
    const color = readColor();
    const palette = readPalette();
    const style = readDisplayStyle();
    const resolved = resolvePattern(pattern);
    setThemePatternState(pattern);
    setThemeColorState(color);
    setColorPaletteState(palette);
    setDisplayStyleState(style);
    setColorScheme(resolved);
    applyAttributes(resolved, color, palette, style);
  }, []);

  // System preference listener (when pattern=system)
  useEffect(() => {
    if (themePattern !== 'system') return;
    // For fixed-scheme palettes, pattern changes don't matter
    if (colorPalette && !SCHEMEABLE_PALETTES.has(colorPalette)) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved: ResolvedTheme = mql.matches ? 'dark' : 'light';
      setColorScheme(resolved);
      applyAttributes(resolved, themeColor, colorPalette, displayStyle);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [themePattern, themeColor, colorPalette, displayStyle]);

  // Auto mode — re-check every 60 seconds
  useEffect(() => {
    if (themePattern !== 'auto') return;
    // For fixed-scheme palettes, pattern changes don't matter
    if (colorPalette && !SCHEMEABLE_PALETTES.has(colorPalette)) return;
    const tick = () => {
      const resolved = resolvePattern('auto');
      setColorScheme(resolved);
      applyAttributes(resolved, themeColor, colorPalette, displayStyle);
    };
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [themePattern, themeColor, colorPalette, displayStyle]);

  const setThemePattern = useCallback((pattern: ThemePattern) => {
    localStorage.setItem(STORAGE_KEYS.THEME_PATTERN, pattern);
    const resolved = resolvePattern(pattern);
    setThemePatternState(pattern);
    setColorScheme(resolved);
    applyAttributes(resolved, themeColor, colorPalette, displayStyle);
  }, [themeColor, colorPalette, displayStyle]);

  const setThemeColor = useCallback((color: ThemeColor) => {
    // Changing color clears palette (tier 2 and 3 are mutually exclusive)
    localStorage.setItem(STORAGE_KEYS.THEME_COLOR, color);
    localStorage.removeItem(STORAGE_KEYS.COLOR_PALETTE);
    setThemeColorState(color);
    setColorPaletteState(null);
    applyAttributes(colorScheme, color, null, displayStyle);
  }, [colorScheme, displayStyle]);

  const setColorPalette = useCallback((palette: ColorPalette | null) => {
    if (palette) {
      localStorage.setItem(STORAGE_KEYS.COLOR_PALETTE, palette);
    } else {
      localStorage.removeItem(STORAGE_KEYS.COLOR_PALETTE);
    }
    setColorPaletteState(palette);
    applyAttributes(colorScheme, themeColor, palette, displayStyle);
  }, [colorScheme, themeColor, displayStyle]);

  const setDisplayStyle = useCallback((style: DisplayStyle) => {
    if (style === 'default') {
      localStorage.removeItem(STORAGE_KEYS.DISPLAY_STYLE);
    } else {
      localStorage.setItem(STORAGE_KEYS.DISPLAY_STYLE, style);
    }
    setDisplayStyleState(style);
    applyAttributes(colorScheme, themeColor, colorPalette, style);
  }, [colorScheme, themeColor, colorPalette]);

  return (
    <ThemeContext.Provider value={{
      themePattern, themeColor, colorPalette, displayStyle, colorScheme,
      setThemePattern, setThemeColor, setColorPalette, setDisplayStyle,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
