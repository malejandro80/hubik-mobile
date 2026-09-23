const scale = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const spacing = {
  ...scale,
  touchMin: 48,
  touchDefault: 52,
  gutter: scale.lg,
  gutterMobile: scale.md,
  margin: scale.xl,
  marginMobile: scale.lg,
  spaceXS: scale.sm,
  spaceSM: scale.md,
  spaceMD: scale.lg,
  spaceLG: scale.xl,
  spaceXL: scale.xxl,
};

export const hitSlop = {
  compact: { top: 6, bottom: 6, left: 6, right: 8 },
  default: { top: 8, bottom: 8, left: 8, right: 8 },
  spacious: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;

export const HIT_SLOP_DEFAULT = hitSlop.default;
