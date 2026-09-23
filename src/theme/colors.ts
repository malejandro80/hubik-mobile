import { palette } from './palette';

export const sereneHearthLight = {
  background: palette.ivory,
  surface: palette.white,
  surfaceMuted: palette.stone100,
  surfaceContainer: palette.stone100,
  surfaceContainerLowest: palette.white,
  surfaceContainerLow: palette.stone50,
  surfaceContainerHigh: palette.stone150,
  surfaceContainerHighest: palette.stone200,

  text: palette.ink,
  textSecondary: palette.stone700,
  textTertiary: palette.stone600,
  onSurface: palette.ink,
  onSurfaceVariant: palette.stone700,

  primary: palette.forest800,
  primaryText: palette.ivory,
  onPrimary: palette.ivory,
  primaryContainer: palette.forest800,
  onPrimaryContainer: palette.sage200,

  secondary: palette.forest600,
  onSecondary: palette.white,
  secondaryContainer: palette.mint50,
  onSecondaryContainer: palette.forest700,

  tertiary: palette.stone600,
  onTertiary: palette.white,

  border: palette.stone200,
  borderStrong: palette.stone500,
  outline: palette.stone500,
  outlineVariant: palette.stone200,

  card: palette.white,
  userBubble: palette.stone100,
  userBubbleBorder: palette.stone200,
  assistantBubble: palette.white,
  assistantBubbleBorder: palette.stone200,
  badgeBackground: palette.stone100,
  badgeBorder: palette.stone600,
  disabled: palette.stone250,
  error: palette.red700,
  errorContainer: palette.red100,
  scrim: palette.scrimLight,
};

export type ThemeColors = Record<keyof typeof sereneHearthLight, string>;

export const sereneHearthDark: ThemeColors = {
  background: palette.night950,
  surface: palette.night900,
  surfaceMuted: palette.night800,
  surfaceContainer: palette.night800,
  surfaceContainerLowest: palette.night950,
  surfaceContainerLow: palette.night850,
  surfaceContainerHigh: palette.night750,
  surfaceContainerHighest: palette.night650,

  text: palette.mist50,
  textSecondary: palette.mist200,
  textTertiary: palette.mist400,
  onSurface: palette.mist50,
  onSurfaceVariant: palette.mist200,

  primary: palette.sage200,
  primaryText: palette.forest900,
  onPrimary: palette.forest900,
  primaryContainer: palette.forest800,
  onPrimaryContainer: palette.sage50,

  secondary: palette.sage300,
  onSecondary: palette.greenInk,
  secondaryContainer: palette.forest700,
  onSecondaryContainer: palette.sage100,

  tertiary: palette.mist400,
  onTertiary: palette.night950,

  border: palette.night700,
  borderStrong: palette.mist500,
  outline: palette.mist500,
  outlineVariant: palette.night700,

  card: palette.night900,
  userBubble: palette.night800,
  userBubbleBorder: palette.night700,
  assistantBubble: palette.night900,
  assistantBubbleBorder: palette.night700,
  badgeBackground: palette.night800,
  badgeBorder: palette.mist400,
  disabled: palette.night700,
  error: palette.red200,
  errorContainer: palette.red900,
  scrim: palette.scrimDark,
};

export const colors = {
  light: sereneHearthLight,
  dark: sereneHearthDark,
};
