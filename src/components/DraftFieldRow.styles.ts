import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

export const getDraftFieldRowStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: theme.outlineVariant,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.touchMin,
      paddingVertical: 8,
    },
    icon: {
      marginRight: 10,
    },
    label: {
      ...typography.labelLG,
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      width: 130,
    },
    value: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    status: {
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 8,
      color: theme.textSecondary,
    },
    statusChanged: {
      color: theme.secondary,
    },
    editor: {
      paddingBottom: 12,
    },
    input: {
      minHeight: spacing.touchMin,
      borderWidth: 1.5,
      borderColor: theme.secondary,
      borderRadius: shapes.md,
      paddingHorizontal: 14,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.surfaceContainerLow,
    },
    error: {
      fontSize: 13,
      marginTop: 6,
      color: theme.error,
    },
    actions: {
      flexDirection: 'row',
      marginTop: 10,
    },
    actionButton: {
      minHeight: spacing.touchMin,
      paddingHorizontal: 20,
      marginRight: 10,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    actionButtonSecondary: {
      backgroundColor: theme.surfaceContainerLow,
      borderWidth: 1.5,
      borderColor: theme.outlineVariant,
    },
    actionText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.onPrimary,
    },
    actionTextSecondary: {
      color: theme.text,
    },
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingBottom: 12,
    },
    option: {
      minHeight: spacing.touchMin,
      paddingHorizontal: 18,
      marginRight: 8,
      marginBottom: 8,
      borderRadius: shapes.full,
      borderWidth: 1.5,
      borderColor: theme.outlineVariant,
      justifyContent: 'center',
      backgroundColor: theme.surfaceContainerLow,
    },
    optionText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
  });
