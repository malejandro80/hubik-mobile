import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getSuggestionChipsStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.sm,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
    },
    chip: {
      borderWidth: 1,
      borderRadius: radii.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginRight: spacing.sm,
      minHeight: spacing.touchMin,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    chipDisabled: {
      opacity: 0.5,
    },
    chipText: {
      ...typography.label,
      color: theme.text,
    },
    chipIconText: {
      color: theme.secondary,
    },
  });
