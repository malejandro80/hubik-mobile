import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getWhatsAppFieldStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: theme.surfaceMuted,
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.label,
      color: theme.text,
    },
    hint: {
      ...typography.caption,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    value: {
      ...typography.body,
      color: theme.text,
      flexShrink: 1,
    },
    input: {
      ...typography.body,
      minHeight: spacing.touchMin,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      backgroundColor: theme.surface,
      color: theme.text,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    button: {
      minHeight: spacing.touchMin,
      minWidth: spacing.touchMin,
      paddingHorizontal: spacing.md,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    buttonText: {
      ...typography.label,
      color: theme.onPrimary,
    },
    secondaryButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderStrong,
    },
    secondaryButtonText: {
      ...typography.label,
      color: theme.text,
    },
    error: {
      ...typography.caption,
      color: theme.error,
      marginTop: spacing.xs,
    },
  });
