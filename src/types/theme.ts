// Theme type definitions (adapted from dooooApp/utils/theme.ts)

export type ThemePattern = 'auto' | 'light' | 'dark';

export type ThemeColor = 'emerald' | 'ocean' | 'crimson' | 'amber' | 'yellow' | 'cyan' | 'purple' | 'pink';

export interface ThemeColors {
  background: string;
  foreground: string;
  surface: string;
  inputBackground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  destructive: string;
  destructiveForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  border: string;
}

export interface Theme {
  colorScheme: 'light' | 'dark';
  colors: ThemeColors;
}
