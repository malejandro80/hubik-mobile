import { StyleSheet } from 'react-native';
import { radii, spacing, ThemeColors, typography } from '../theme';

const AVATAR_SIZE = 44;

export const getPropertyAgentCardStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surfaceMuted,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginVertical: spacing.md,
    },
    avatarCircle: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: radii.full,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    avatarInitial: {
      ...typography.headline,
      color: theme.primaryText,
    },
    textContainer: {
      flex: 1,
    },
    attributionPrompt: {
      ...typography.caption,
      color: theme.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    attributionName: {
      ...typography.bodyStrong,
      color: theme.text,
    },
    agencySubtitle: {
      ...typography.caption,
      color: theme.textSecondary,
    },
  });
