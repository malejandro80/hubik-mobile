import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme';

export const getPropertyAskPanelStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    thread: {
      paddingHorizontal: spacing.marginMobile,
    },
    signIn: {
      minHeight: spacing.touchMin,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: spacing.marginMobile,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: shapes.full,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    signInText: {
      ...typography.label,
      color: theme.primary,
      textAlign: 'center',
    },
  });
