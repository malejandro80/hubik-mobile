import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const AVATAR_SIZE = 44;

export const getDrawerProfileCardStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.touchMin,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: theme.surfaceMuted,
      marginVertical: spacing.lg,
    },
    avatarCircle: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: radii.full,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      overflow: 'hidden',
    },
    avatarImage: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    },
    avatarText: {
      ...typography.label,
      color: theme.onPrimary,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      ...typography.bodyStrong,
      color: theme.text,
    },
    profileRole: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    guestCta: {
      ...typography.label,
      color: theme.secondary,
    },
  });
