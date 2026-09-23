import { ThemeColors } from './colors';

type ColorRole = keyof ThemeColors;

export interface ContrastPair {
  fg: ColorRole;
  bg: ColorRole;
  min: number;
}

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const TEXT_ROLES: ColorRole[] = ['text', 'textSecondary', 'textTertiary', 'primary', 'secondary', 'error'];
const BASE_SURFACES: ColorRole[] = ['background', 'surface', 'surfaceMuted'];

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  ...TEXT_ROLES.flatMap((fg) => BASE_SURFACES.map((bg) => ({ fg, bg, min: AA_TEXT }))),
  ...BASE_SURFACES.map((bg) => ({ fg: 'borderStrong' as const, bg, min: AA_NON_TEXT })),
  { fg: 'primaryText', bg: 'primary', min: AA_TEXT },
  { fg: 'onPrimary', bg: 'primary', min: AA_TEXT },
  { fg: 'onPrimaryContainer', bg: 'primaryContainer', min: AA_TEXT },
  { fg: 'onSecondary', bg: 'secondary', min: AA_TEXT },
  { fg: 'onSecondaryContainer', bg: 'secondaryContainer', min: AA_TEXT },
  { fg: 'text', bg: 'userBubble', min: AA_TEXT },
  { fg: 'text', bg: 'assistantBubble', min: AA_TEXT },
  { fg: 'text', bg: 'card', min: AA_TEXT },
  { fg: 'textSecondary', bg: 'card', min: AA_TEXT },
  { fg: 'text', bg: 'errorContainer', min: AA_TEXT },
];
