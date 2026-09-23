import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getScreenChatBarStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    replyStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      backgroundColor: theme.surfaceMuted,
    },
    replyText: {
      ...typography.body,
      flex: 1,
      color: theme.text,
    },
    openButton: {
      minHeight: spacing.touchMin,
      paddingHorizontal: spacing.md,
      marginLeft: spacing.sm,
      justifyContent: 'center',
    },
    openText: {
      ...typography.label,
      color: theme.secondary,
    },
  });
