import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import { useLanguage } from './language-context';
import type { SupportedLanguage } from './language-context';
import {
  getFontsForLanguage,
  getPreviewText,
  type WebFontDefinition,
  type FontSize,
  FONT_SIZE_SCALE,
  FONT_SIZES,
} from '../font-config';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------
interface FontContextType {
  currentFontId: string;
  fontSize: FontSize;
  fontOptions: WebFontDefinition[];
  selectFont: (fontId: string) => void;
  setFontSize: (size: FontSize) => void;
  previewText: string;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error('useFont must be used within a FontProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Per-language font map persistence
// ---------------------------------------------------------------------------
type FontMap = Record<string, string>;

function readFontMap(): FontMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FONT_FAMILY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as FontMap;
    }
    // Legacy: if it's a plain string (old format), migrate
    if (typeof parsed === 'string') return {};
    return {};
  } catch {
    return {};
  }
}

function saveFontMap(map: FontMap): void {
  localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, JSON.stringify(map));
}

function readFontSize(): FontSize {
  const stored = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
  if (stored && (FONT_SIZES as readonly string[]).includes(stored)) {
    return stored as FontSize;
  }
  return 'md';
}

// ---------------------------------------------------------------------------
// CSS variable helpers
// ---------------------------------------------------------------------------
function applyFontToDocument(fontDef: WebFontDefinition | undefined, size: FontSize): void {
  const el = document.documentElement;

  // Set font-family directly as inline style on <html>.
  // Tailwind v4's @tailwindcss/vite plugin absorbs CSS rules from the
  // stylesheet into @layer theme, making it impossible to override
  // font-family via a CSS variable or custom rule. Inline style on the
  // element has the highest cascade priority, so it always wins.
  if (!fontDef || fontDef.isSystemDefault) {
    el.style.removeProperty('font-family');
  } else if (fontDef.cssFamily) {
    el.style.setProperty('font-family', fontDef.cssFamily);
  }
  el.style.setProperty('--font-size-scale', String(FONT_SIZE_SCALE[size]));
}

// ---------------------------------------------------------------------------
// Google Fonts <link> management
// ---------------------------------------------------------------------------
const ACTIVE_LINK_ID = 'doooo-google-font-active';

function loadGoogleFont(fontDef: WebFontDefinition): void {
  if (fontDef.isSystemDefault || !fontDef.googleFontsFamily) {
    // Remove active link when switching to system default
    const existing = document.getElementById(ACTIVE_LINK_ID);
    if (existing) existing.remove();
    return;
  }

  let link = document.getElementById(ACTIVE_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = ACTIVE_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  const url = `https://fonts.googleapis.com/css2?family=${fontDef.googleFontsFamily}&display=swap`;
  if (link.href !== url) {
    link.href = url;
  }
}

// ---------------------------------------------------------------------------
// Resolve font for a language from the stored map
// ---------------------------------------------------------------------------
function resolveFont(
  lang: SupportedLanguage,
  fontMap: FontMap,
): { fontId: string; fontDef: WebFontDefinition } {
  const options = getFontsForLanguage(lang);
  const storedId = fontMap[lang];
  if (storedId) {
    const found = options.find(f => f.id === storedId);
    if (found) return { fontId: storedId, fontDef: found };
  }
  // Default to system
  return { fontId: 'system', fontDef: options[0] };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function FontProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const prevLanguageRef = useRef(language);
  const fontMapRef = useRef(readFontMap());

  const fontOptions = getFontsForLanguage(language);
  const previewText = getPreviewText(language);

  // Initialize from stored per-language map
  const initial = resolveFont(language, fontMapRef.current);
  const [currentFontId, setCurrentFontId] = useState(initial.fontId);
  const [fontSize, setFontSizeState] = useState<FontSize>(readFontSize);

  // Apply on mount
  useEffect(() => {
    const { fontDef } = resolveFont(language, fontMapRef.current);
    applyFontToDocument(fontDef, readFontSize());
    loadGoogleFont(fontDef);
  }, []);

  // Language change: look up new language's stored font
  useEffect(() => {
    if (prevLanguageRef.current === language) return;
    prevLanguageRef.current = language;

    const { fontId, fontDef } = resolveFont(language, fontMapRef.current);
    setCurrentFontId(fontId);
    applyFontToDocument(fontDef, fontSize);
    loadGoogleFont(fontDef);
  }, [language, fontSize]);

  // Select a font (user action)
  const selectFont = useCallback(
    (fontId: string) => {
      const fontDef = fontOptions.find(f => f.id === fontId);
      if (!fontDef || fontId === currentFontId) return;

      setCurrentFontId(fontId);
      applyFontToDocument(fontDef, fontSize);
      loadGoogleFont(fontDef);

      // Persist per-language
      fontMapRef.current = { ...fontMapRef.current, [language]: fontId };
      saveFontMap(fontMapRef.current);
    },
    [fontOptions, currentFontId, fontSize, language],
  );

  // Set font size
  const setFontSize = useCallback(
    (size: FontSize) => {
      setFontSizeState(size);
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, size);

      const fontDef = fontOptions.find(f => f.id === currentFontId) ?? fontOptions[0];
      applyFontToDocument(fontDef, size);
    },
    [fontOptions, currentFontId],
  );

  return (
    <FontContext.Provider
      value={{ currentFontId, fontSize, fontOptions, selectFont, setFontSize, previewText }}
    >
      {children}
    </FontContext.Provider>
  );
}
