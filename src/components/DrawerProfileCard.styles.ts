import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

export const AVATAR_SIZE = 42;

export const getDrawerProfileCardStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.touchMin,
      padding: 14,
      borderRadius: shapes.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      marginVertical: 18,
    },
    avatarCircle: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: shapes.full,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      overflow: 'hidden',
    },
    avatarImage: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    },
    avatarText: {
      color: theme.onPrimary,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      ...typography.labelLG,
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    profileRole: {
      fontSize: 13,
      marginTop: 2,
      color: theme.textSecondary,
    },
    guestCta: {
      fontSize: 14,
      marginTop: 2,
      fontWeight: '700',
      color: theme.secondary,
    },
  });
