import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { ThemeColors } from './colors';

export type ElevationLevel = 'none' | 'raised' | 'overlay';

interface ShadowSpec {
  offsetY: number;
  radius: number;
  opacity: number;
  androidElevation: number;
}

const SHADOW_COLOR = '#0B2520';

const SPECS: Record<Exclude<ElevationLevel, 'none'>, ShadowSpec> = {
  raised: { offsetY: 1, radius: 4, opacity: 0.06, androidElevation: 1 },
  overlay: { offsetY: 8, radius: 24, opacity: 0.12, androidElevation: 8 },
};

function shadow(spec: ShadowSpec): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation: spec.androidElevation },
    web: {
      boxShadow: `0px ${spec.offsetY}px ${spec.radius}px rgba(11, 37, 32, ${spec.opacity})`,
    },
    default: {
      shadowColor: SHADOW_COLOR,
      shadowOffset: { width: 0, height: spec.offsetY },
      shadowRadius: spec.radius,
      shadowOpacity: spec.opacity,
    },
  });
}

export function elevation(level: ElevationLevel, theme: ThemeColors): ViewStyle {
  if (level === 'none') return {};
  const border = { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border };
  return level === 'raised' ? { ...border, ...shadow(SPECS.raised) } : { ...border, ...shadow(SPECS.overlay) };
}
