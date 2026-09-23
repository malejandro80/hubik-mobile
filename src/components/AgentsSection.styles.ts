import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme';

export const getAgentsSectionStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.spaceMD,
      gap: spacing.spaceSM,
    },
    title: {
      ...typography.label,
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    subtitle: {
      ...typography.body,
      fontSize: 15,
      color: theme.textSecondary,
    },
    fieldLabel: {
      ...typography.label,
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
    hint: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    selected: {
      minHeight: spacing.touchMin + 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: theme.secondary,
      borderRadius: shapes.md,
      backgroundColor: theme.surfaceContainerLow,
    },
    selectedText: {
      flex: 1,
    },
    selectedName: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    selectedEmail: {
      fontSize: 15,
      color: theme.textSecondary,
      marginTop: 2,
    },
    changeButton: {
      minHeight: spacing.touchMin,
      minWidth: spacing.touchMin,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    changeText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.secondary,
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
      ...typography.label,
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
