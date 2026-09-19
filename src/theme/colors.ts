import { Platform } from 'react-native';

export const sereneHearthLight = {
  background: '#FAFAF7',
  surface: '#F8FAF7',
  surfaceContainer: '#F0EFEA',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F2F4F2',
  surfaceContainerHigh: '#E7E9E6',
  surfaceContainerHighest: '#E1E3E1',

  text: '#191C1B',
  textSecondary: '#3F4845',
  onSurface: '#191C1B',
  onSurfaceVariant: '#3F4845',

  primary: '#1A3A34',
  primaryText: '#FAFAF7',
  onPrimary: '#FFFFFF',
  primaryContainer: '#1A3A34',
  onPrimaryContainer: '#83A49C',

  secondary: '#2C685A',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#B1EFDD',
  onSecondaryContainer: '#336E60',

  tertiary: '#608076',
  onTertiary: '#FFFFFF',

  border: '#D1D5DB',
  outline: '#D1D5DB',
  outlineVariant: '#CBD5E1',

  card: '#FFFFFF',
  userBubble: '#E6E4DD',
  userBubbleBorder: '#CBD5E1',
  assistantBubble: '#FFFFFF',
  assistantBubbleBorder: '#D1D5DB',
  badgeBackground: '#F0EFEA',
  badgeBorder: '#608076',
  disabled: '#A0A7A5',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
};

export const sereneHearthDark = {
  background: '#111413',
  surface: '#191C1B',
  surfaceContainer: '#232725',
  surfaceContainerLowest: '#191C1B',
  surfaceContainerLow: '#1E2220',
  surfaceContainerHigh: '#282D2B',
  surfaceContainerHighest: '#313734',

  text: '#F8FAF7',
  textSecondary: '#C1C8C5',
  onSurface: '#F8FAF7',
  onSurfaceVariant: '#C1C8C5',

  primary: '#ABCEC5',
  primaryText: '#00201B',
  onPrimary: '#00201B',
  primaryContainer: '#1A3A34',
  onPrimaryContainer: '#C7EAE1',

  secondary: '#96D3C1',
  onSecondary: '#00201A',
  secondaryContainer: '#2C685A',
  onSecondaryContainer: '#B1EFDD',

  tertiary: '#ACCEC2',
  onTertiary: '#002019',

  border: '#3F4845',
  outline: '#717976',
  outlineVariant: '#3F4845',

  card: '#191C1B',
  userBubble: '#2E3130',
  userBubbleBorder: '#414846',
  assistantBubble: '#191C1B',
  assistantBubbleBorder: '#3F4845',
  badgeBackground: '#232725',
  badgeBorder: '#717976',
  disabled: '#4B5563',
  error: '#FFB4AB',
  errorContainer: '#93000A',
};

export const colors = {
  light: sereneHearthLight,
  dark: sereneHearthDark,
};

export type ThemeColors = typeof sereneHearthLight;

export const typography = {
  headlineXL: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 44,
  },
  headlineXLinMobile: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 38,
  },
  headlineLG: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 26,
    fontWeight: '600' as const,
    lineHeight: 36,
  },
  headlineMD: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  bodyXL: {
    fontSize: 20,
    fontWeight: '400' as const,
    lineHeight: 32,
  },
  bodyLG: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodyMD: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 28,
  },
  labelLG: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  labelMD: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const shapes = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const spacing = {
  gutter: 16,
  gutterMobile: 12,
  margin: 24,
  marginMobile: 20,
  spaceXS: 8,
  spaceSM: 12,
  spaceMD: 20,
  spaceLG: 28,
  spaceXL: 40,
  touchMin: 52,
  touchDefault: 56,
};

export const hitSlop = {
  compact: { top: 6, bottom: 6, left: 6, right: 8 },
  default: { top: 8, bottom: 8, left: 8, right: 8 },
  spacious: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

export const HIT_SLOP_DEFAULT = hitSlop.default;

