import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary';

interface ButtonVariantConfig {
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  borderWidth: number;
}

export const getButtonStyles = (
  theme: ThemeColors,
  variant: ButtonVariant = 'primary',
  disabled: boolean = false
) => {
  const variantConfigs: Record<ButtonVariant, ButtonVariantConfig> = {
    primary: {
      backgroundColor: disabled ? theme.disabled : theme.primary,
      textColor: disabled ? theme.textTertiary : theme.primaryText,
      borderColor: undefined,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: theme.surface,
      textColor: disabled ? theme.textTertiary : theme.primary,
      borderColor: disabled ? theme.border : theme.primary,
      borderWidth: 1,
    },
  };

  const { backgroundColor, textColor, borderColor, borderWidth } =
    variantConfigs[variant];

  return {
    styles: StyleSheet.create({
      container: {
        minHeight: spacing.touchDefault,
        minWidth: 120,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        backgroundColor,
        borderColor,
        borderWidth,
      },
      pressed: {
        opacity: 0.85,
      },
      text: {
        ...typography.label,
        textAlign: 'center',
        color: textColor,
      },
    }),
    textColor,
  };
};
