import { StyleSheet } from 'react-native';
import { TYPING_DOT_SIZE } from '../constants/typewriter';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getTypingIndicatorStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    dots: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    dot: {
      width: TYPING_DOT_SIZE,
      height: TYPING_DOT_SIZE,
      borderRadius: radii.full,
      backgroundColor: theme.primary,
    },
    label: {
      ...typography.body,
      color: theme.textSecondary,
    },
  });
