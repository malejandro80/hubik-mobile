import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

export const getAgentsSectionStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.spaceMD,
      gap: spacing.spaceSM,
    },
    title: {
      ...typography.labelLG,
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    subtitle: {
      ...typography.bodyLG,
      fontSize: 15,
      color: theme.textSecondary,
    },
    fieldLabel: {
      ...typography.labelLG,
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    input: {
      minHeight: spacing.touchMin,
      borderWidth: 1.5,
      borderColor: theme.outlineVariant,
      borderRadius: shapes.md,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.surfaceContainerLow,
    },
    feedback: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    feedbackSuccess: {
      color: theme.secondary,
    },
    feedbackError: {
      color: theme.error,
    },
    listTitle: {
      ...typography.labelLG,
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      marginTop: spacing.spaceSM,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.touchMin,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.outlineVariant,
    },
    rowMain: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
    },
    rowTag: {
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 10,
      color: theme.textSecondary,
    },
    rowTagPending: {
      color: theme.secondary,
    },
    cancelButton: {
      minHeight: spacing.touchMin,
      paddingHorizontal: 14,
      marginLeft: 8,
      justifyContent: 'center',
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.error,
    },
    muted: {
      fontSize: 15,
      color: theme.textSecondary,
    },
  });
