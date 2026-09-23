import { StyleSheet } from 'react-native';
import { INSTALL_SHEET_MAX_WIDTH } from '../constants/share';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getInstallBarStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    bar: {
      width: '100%',
      maxWidth: INSTALL_SHEET_MAX_WIDTH,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: spacing.lg,
      paddingRight: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    text: {
      ...typography.label,
      flex: 1,
      color: theme.text,
    },
    button: {
      minHeight: spacing.touchMin,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    buttonText: {
      ...typography.label,
      color: theme.onPrimary,
    },
  });
