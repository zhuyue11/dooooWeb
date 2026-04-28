// App configuration — reads from Vite environment variables

export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3001',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',

  VALIDATION: {
    PASSWORD_MIN_LENGTH: 8,
    NAME_MAX_LENGTH: 100,
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 5000,
  },
} as const;

// Storage keys — same keys as dooooApp for consistency
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@doooo_auth_token',
  THEME_PATTERN: '@doooo_theme_pattern',
  THEME_COLOR: '@doooo_theme_color',
  COLOR_PALETTE: '@doooo_color_palette',
  LANGUAGE: '@doooo_language',
  DATE_FORMAT: '@doooo_date_format',
  TIME_FORMAT: '@doooo_time_format',
  WEEK_START_DAY: '@doooo_week_start_day',
  DISPLAY_STYLE: '@doooo_display_style',
} as const;
