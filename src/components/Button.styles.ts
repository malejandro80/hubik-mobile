import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

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
      textColor: theme.primaryText,
      borderColor: undefined,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: theme.surfaceContainer,
      textColor: disabled ? theme.disabled : theme.primary,
      borderColor: theme.primary,
      borderWidth: 2,
    },
  };

  const { backgroundColor, textColor, borderColor, borderWidth } =
    variantConfigs[variant];

  return {
    styles: StyleSheet.create({
      container: {
        minHeight: spacing.touchDefault,
        minWidth: 120,
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: shapes.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        backgroundColor,
        borderColor,
        borderWidth,
      },
      pressed: {
        opacity: 0.88,
        transform: [{ scale: 0.98 }],
      },
      text: {
        ...typography.labelLG,
        textAlign: 'center',
        letterSpacing: 0.2,
        color: textColor,
      },
    }),
    textColor,
  };
};
