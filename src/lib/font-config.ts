import type { SupportedLanguage } from './contexts/language-context';

// ---------------------------------------------------------------------------
// Script groups — each language maps to one (same as dooooApp)
// ---------------------------------------------------------------------------
export type ScriptGroup =
  | 'latin'
  | 'chinese-simplified'
  | 'chinese-traditional'
  | 'japanese'
  | 'korean'
  | 'arabic'
  | 'persian'
  | 'thai'
  | 'cyrillic';

export const LANGUAGE_SCRIPT_MAP: Record<SupportedLanguage, ScriptGroup> = {
  en: 'latin',
  es: 'latin',
  fr: 'latin',
  de: 'latin',
  pt: 'latin',
  it: 'latin',
  tr: 'latin',
  pl: 'latin',
  nl: 'latin',
  vi: 'latin',
  id: 'latin',
  zh: 'chinese-simplified',
  'zh-Hant': 'chinese-traditional',
  ja: 'japanese',
  ko: 'korean',
  ar: 'arabic',
  fa: 'persian',
  th: 'thai',
  ru: 'cyrillic',
};

// ---------------------------------------------------------------------------
// Web font definition
// ---------------------------------------------------------------------------
export interface WebFontDefinition {
  id: string;
  displayName: string;
  isSystemDefault?: boolean;
  cssFamily?: string;          // CSS font-family value, e.g. "'Jost', sans-serif"
  googleFontsFamily?: string;  // Google Fonts CSS2 API param, e.g. "Jost:wght@400;700"
}

// ---------------------------------------------------------------------------
// Font definitions — one object per distinct font
// ---------------------------------------------------------------------------

// System Default — uses the browser's system font stack
const systemDefault: WebFontDefinition = {
  id: 'system',
  displayName: 'System Default',
  isSystemDefault: true,
};

// Latin fonts
const notoSans: WebFontDefinition = {
  id: 'notoSans',
  displayName: 'Noto Sans',
  cssFamily: "'Noto Sans', sans-serif",
  googleFontsFamily: 'Noto+Sans:wght@400;700',
};

const jost: WebFontDefinition = {
  id: 'jost',
  displayName: 'Jost',
  cssFamily: "'Jost', sans-serif",
  googleFontsFamily: 'Jost:wght@400;700',
};

const exo2: WebFontDefinition = {
  id: 'exo2',
  displayName: 'Exo 2',
  cssFamily: "'Exo 2', sans-serif",
  googleFontsFamily: 'Exo+2:wght@400;700',
};

const quicksand: WebFontDefinition = {
  id: 'quicksand',
  displayName: 'Quicksand',
  cssFamily: "'Quicksand', sans-serif",
  googleFontsFamily: 'Quicksand:wght@400;700',
};

const sairaStencilOne: WebFontDefinition = {
  id: 'sairaStencilOne',
  displayName: 'Saira Stencil One',
  cssFamily: "'Saira Stencil One', sans-serif",
  googleFontsFamily: 'Saira+Stencil+One',
};

const bitcountPropSingle: WebFontDefinition = {
  id: 'bitcountPropSingle',
  displayName: 'Bitcount Prop Single',
  cssFamily: "'Bitcount Prop Single', monospace",
  googleFontsFamily: 'Bitcount+Prop+Single:wght@500;700',
};

// Chinese Simplified fonts
const notoSerifSC: WebFontDefinition = {
  id: 'notoSerifSC',
  displayName: 'Noto Serif SC',
  cssFamily: "'Noto Serif SC', serif",
  googleFontsFamily: 'Noto+Serif+SC:wght@400;700',
};

const lxgwWenKaiTC: WebFontDefinition = {
  id: 'lxgwWenKaiTC',
  displayName: 'LXGW WenKai TC',
  cssFamily: "'LXGW WenKai TC', cursive",
  googleFontsFamily: 'LXGW+WenKai+TC:wght@400;700',
};

// Chinese Traditional fonts
const notoSerifTC: WebFontDefinition = {
  id: 'notoSerifTC',
  displayName: 'Noto Serif TC',
  cssFamily: "'Noto Serif TC', serif",
  googleFontsFamily: 'Noto+Serif+TC:wght@400;700',
};

// Japanese fonts
const notoSansJP: WebFontDefinition = {
  id: 'notoSansJP',
  displayName: 'Noto Sans JP',
  cssFamily: "'Noto Sans JP', sans-serif",
  googleFontsFamily: 'Noto+Sans+JP:wght@400;700',
};

const mplusRounded1c: WebFontDefinition = {
  id: 'mplusRounded1c',
  displayName: 'M PLUS Rounded 1c',
  cssFamily: "'M PLUS Rounded 1c', sans-serif",
  googleFontsFamily: 'M+PLUS+Rounded+1c:wght@400;700',
};

// Korean fonts
const notoSansKR: WebFontDefinition = {
  id: 'notoSansKR',
  displayName: 'Noto Sans KR',
  cssFamily: "'Noto Sans KR', sans-serif",
  googleFontsFamily: 'Noto+Sans+KR:wght@400;700',
};

const nanumGothic: WebFontDefinition = {
  id: 'nanumGothic',
  displayName: 'Nanum Gothic',
  cssFamily: "'Nanum Gothic', sans-serif",
  googleFontsFamily: 'Nanum+Gothic:wght@400;700',
};

// Arabic fonts
const notoSansArabic: WebFontDefinition = {
  id: 'notoSansArabic',
  displayName: 'Noto Sans Arabic',
  cssFamily: "'Noto Sans Arabic', sans-serif",
  googleFontsFamily: 'Noto+Sans+Arabic:wght@400;700',
};

const cairo: WebFontDefinition = {
  id: 'cairo',
  displayName: 'Cairo',
  cssFamily: "'Cairo', sans-serif",
  googleFontsFamily: 'Cairo:wght@400;700',
};

// Persian fonts
const vazirmatn: WebFontDefinition = {
  id: 'vazirmatn',
  displayName: 'Vazirmatn',
  cssFamily: "'Vazirmatn', sans-serif",
  googleFontsFamily: 'Vazirmatn:wght@400;700',
};

// Thai fonts
const notoSansThai: WebFontDefinition = {
  id: 'notoSansThai',
  displayName: 'Noto Sans Thai',
  cssFamily: "'Noto Sans Thai', sans-serif",
  googleFontsFamily: 'Noto+Sans+Thai:wght@400;700',
};

const sarabun: WebFontDefinition = {
  id: 'sarabun',
  displayName: 'Sarabun',
  cssFamily: "'Sarabun', sans-serif",
  googleFontsFamily: 'Sarabun:wght@400;700',
};

// ---------------------------------------------------------------------------
// Script group → font options (System Default + web fonts)
// ---------------------------------------------------------------------------
export const SCRIPT_FONTS: Record<ScriptGroup, WebFontDefinition[]> = {
  latin: [systemDefault, notoSans, jost, quicksand, exo2, sairaStencilOne, bitcountPropSingle],
  'chinese-simplified': [systemDefault, notoSerifSC, lxgwWenKaiTC],
  'chinese-traditional': [systemDefault, notoSerifTC, lxgwWenKaiTC],
  japanese: [systemDefault, notoSansJP, mplusRounded1c],
  korean: [systemDefault, notoSansKR, nanumGothic],
  arabic: [systemDefault, notoSansArabic, cairo],
  persian: [systemDefault, notoSansArabic, vazirmatn],
  thai: [systemDefault, notoSansThai, sarabun],
  cyrillic: [systemDefault, notoSans, jost, quicksand],
};

// ---------------------------------------------------------------------------
// Font size — web-only enhancement
// ---------------------------------------------------------------------------
export const FONT_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const FONT_SIZE_SCALE: Record<FontSize, number> = {
  xs: 0.85,
  sm: 0.925,
  md: 1,
  lg: 1.1,
  xl: 1.25,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getScriptGroup(lang: SupportedLanguage): ScriptGroup {
  return LANGUAGE_SCRIPT_MAP[lang];
}

export function getFontsForLanguage(lang: SupportedLanguage): WebFontDefinition[] {
  return SCRIPT_FONTS[getScriptGroup(lang)];
}

/**
 * Build a single Google Fonts CSS2 API URL that loads all non-system fonts
 * for a given language. Used by FontSettingsPage for preview preloading.
 */
export function buildGoogleFontsUrl(fonts: WebFontDefinition[]): string | null {
  const families = fonts
    .filter(f => !f.isSystemDefault && f.googleFontsFamily)
    .map(f => `family=${f.googleFontsFamily}`);
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}
