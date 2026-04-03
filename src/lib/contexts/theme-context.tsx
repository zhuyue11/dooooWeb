import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import type { ThemePattern, ThemeColor } from '@/types/theme';

interface ThemeContextType {
  themePattern: ThemePattern;
  themeColor: ThemeColor;
  colorScheme: 'light' | 'dark';
  setThemePattern: (pattern: ThemePattern) => void;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getTimeBasedColorScheme(): 'light' | 'dark' {
  const hour = new Date().getHours();
  return (hour >= 6 && hour < 18) ? 'light' : 'dark';
}

function resolveColorScheme(pattern: ThemePattern): 'light' | 'dark' {
  if (pattern === 'auto') return getTimeBasedColorScheme();
  return pattern;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePattern, setThemePatternState] = useState<ThemePattern>(() => {
    return (localStorage.getItem(STORAGE_KEYS.THEME_PATTERN) as ThemePattern) || 'auto';
  });

  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem(STORAGE_KEYS.THEME_COLOR) as ThemeColor) || 'emerald';
  });

  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => resolveColorScheme(themePattern));

  // Apply dark class to <html>
  useEffect(() => {
    const scheme = resolveColorScheme(themePattern);
    setColorScheme(scheme);
    document.documentElement.classList.toggle('dark', scheme === 'dark');
  }, [themePattern]);

  // Re-check time-based theme every minute when in auto mode
  useEffect(() => {
    if (themePattern !== 'auto') return;
    const interval = setInterval(() => {
      const scheme = getTimeBasedColorScheme();
      setColorScheme(scheme);
      document.documentElement.classList.toggle('dark', scheme === 'dark');
    }, 60_000);
    return () => clearInterval(interval);
  }, [themePattern]);

  const setThemePattern = useCallback((pattern: ThemePattern) => {
    setThemePatternState(pattern);
    localStorage.setItem(STORAGE_KEYS.THEME_PATTERN, pattern);
  }, []);

  const setThemeColor = useCallback((color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem(STORAGE_KEYS.THEME_COLOR, color);
  }, []);

  return (
    <ThemeContext.Provider value={{ themePattern, themeColor, colorScheme, setThemePattern, setThemeColor }}>
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
