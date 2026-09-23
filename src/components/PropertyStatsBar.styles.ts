import { StyleSheet } from 'react-native';
import { radii, spacing, ThemeColors, typography } from '../theme';

export const getPropertyStatsBarStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginVertical: spacing.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceMuted,
      borderRadius: radii.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    label: {
      ...typography.label,
      color: theme.text,
    },
  });
