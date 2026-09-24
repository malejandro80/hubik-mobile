import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getLandlordPickerStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: spacing.lg,
    },
    title: {
      ...typography.label,
      color: theme.text,
      marginBottom: spacing.sm,
    },
    input: {
      ...typography.body,
      minHeight: spacing.touchMin,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      backgroundColor: theme.surface,
      color: theme.text,
    },
    selected: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      minHeight: spacing.touchMin,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      backgroundColor: theme.surfaceMuted,
    },
    selectedText: {
      ...typography.body,
      color: theme.text,
      flexShrink: 1,
    },
    removeButton: {
      minHeight: spacing.touchMin,
      minWidth: spacing.touchMin,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeText: {
      ...typography.label,
      color: theme.secondary,
    },
  });
