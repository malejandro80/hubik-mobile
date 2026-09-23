import { StyleSheet } from 'react-native';
import { ThemeColors, elevation, radii, spacing, typography } from '../theme';

export const getSlashCommandMenuStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      ...elevation('overlay', theme),
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: theme.surface,
      overflow: 'hidden',
    },
    row: {
      minHeight: spacing.touchDefault,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      justifyContent: 'center',
    },
    command: {
      ...typography.bodyStrong,
      color: theme.text,
    },
    hint: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    note: {
      ...typography.body,
      color: theme.textSecondary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
  });
