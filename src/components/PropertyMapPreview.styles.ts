import { StyleSheet } from 'react-native';
import { radii, spacing, ThemeColors, typography } from '../theme';

export const getPropertyMapPreviewStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      height: 180,
      borderRadius: radii.lg,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      backgroundColor: theme.surfaceMuted,
      marginVertical: spacing.md,
      position: 'relative',
    },
    webview: {
      flex: 1,
      backgroundColor: theme.surfaceMuted,
    },
    badge: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      backgroundColor: theme.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    badgeText: {
      ...typography.caption,
      color: theme.textSecondary,
    },
  });
