import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export type AppColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primarySoft: string;
  danger: string;
  border: string;
  tabBar: string;
  tabBarBorder: string;
};

export const lightColors: AppColors = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2FF',
  text: '#111827',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',
  primary: '#2563EB',
  primarySoft: '#DBEAFE',
  danger: '#B91C1C',
  border: '#E5E7EB',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
};

export const darkColors: AppColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceMuted: '#334155',
  text: '#F1F5F9',
  textMuted: '#CBD5E1',
  textInverse: '#FFFFFF',
  primary: '#3B82F6',
  primarySoft: '#1E40AF',
  danger: '#EF4444',
  border: '#475569',
  tabBar: '#1E293B',
  tabBarBorder: '#334155',
};

export function getAppColors(theme: ResolvedTheme): AppColors {
  return theme === 'dark' ? darkColors : lightColors;
}

export function getNavigationTheme(theme: ResolvedTheme): NavigationTheme {
  const baseTheme = theme === 'dark' ? NavigationDarkTheme : NavigationLightTheme;
  const colors = getAppColors(theme);

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      primary: colors.primary,
      notification: colors.danger,
    },
  };
}
