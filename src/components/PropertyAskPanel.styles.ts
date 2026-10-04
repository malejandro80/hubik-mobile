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
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.marginMobile,
    },
    headerButton: {
      minHeight: spacing.touchMin,
      minWidth: spacing.touchMin,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonText: {
      ...typography.label,
      color: theme.primary,
    },
    reopen: {
      alignSelf: 'center',
      minHeight: spacing.touchMin,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: shapes.full,
      backgroundColor: theme.secondaryContainer,
    },
    reopenText: {
      ...typography.label,
      color: theme.onSecondaryContainer,
    },
  });
