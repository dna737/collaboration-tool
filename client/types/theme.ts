export interface CanvasTheme {
  isDark: boolean;
  pageBackground: string;
  panelBackground: string;
  panelBorder: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
  overlayBackdrop: string;
}

export const lightTheme: CanvasTheme = {
  isDark: false,
  pageBackground: '#fafafa',
  panelBackground: '#ffffff',
  panelBorder: '#e5e7eb',
  textPrimary: '#111827',
  textMuted: '#6b7280',
  accent: '#3b82f6',
  overlayBackdrop: 'rgba(0, 0, 0, 0.45)',
};

export const darkTheme: CanvasTheme = {
  isDark: true,
  pageBackground: '#0f172a',
  panelBackground: '#111827',
  panelBorder: '#374151',
  textPrimary: '#f9fafb',
  textMuted: '#9ca3af',
  accent: '#60a5fa',
  overlayBackdrop: 'rgba(0, 0, 0, 0.6)',
};
