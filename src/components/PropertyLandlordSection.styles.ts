import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getPropertyLandlordSectionStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: theme.surfaceMuted,
    },
    title: {
      ...typography.label,
      color: theme.text,
    },
    value: {
      ...typography.body,
      color: theme.text,
      marginTop: spacing.xs,
    },
  });
