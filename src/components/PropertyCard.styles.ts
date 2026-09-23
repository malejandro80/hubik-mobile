import { StyleSheet } from 'react-native';
import { ThemeColors, elevation, radii, spacing, typography } from '../theme';

export const getPropertyCardStyles = (theme: ThemeColors) => ({
  styles: StyleSheet.create({
    card: {
      ...elevation('raised', theme),
      borderRadius: radii.lg,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      backgroundColor: theme.card,
    },
    imageContainer: {
      width: '100%',
      height: 210,
      position: 'relative',
      backgroundColor: theme.surfaceMuted,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    topBadgesRow: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    exclusiveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primaryContainer,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      marginRight: spacing.sm,
    },
    ownBadge: {
      backgroundColor: theme.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
    },
    ownBadgeText: {
      ...typography.caption,
      color: theme.primary,
    },
    exclusiveDot: {
      ...typography.caption,
      color: theme.onPrimaryContainer,
    },
    exclusiveText: {
      ...typography.caption,
      color: theme.onPrimaryContainer,
    },
    exclusivePercent: {
      ...typography.caption,
      color: theme.onPrimaryContainer,
    },
    photoCountBadge: {
      ...elevation('raised', theme),
      position: 'absolute',
      bottom: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
    },
    cameraIcon: {
      marginRight: spacing.xs,
    },
    photoCountText: {
      ...typography.caption,
      color: theme.text,
    },
    content: {
      padding: spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.title,
      flex: 1,
      color: theme.text,
    },
    address: {
      ...typography.body,
      marginBottom: spacing.sm,
      color: theme.textSecondary,
    },
    listedBy: {
      ...typography.caption,
      marginBottom: spacing.sm,
      color: theme.textTertiary,
    },
    specsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: spacing.lg,
    },
    specText: {
      ...typography.body,
      color: theme.textSecondary,
    },
    specDot: {
      ...typography.body,
      color: theme.textTertiary,
    },
    financialRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.lg,
    },
    priceCol: {
      flex: 1,
    },
    price: {
      ...typography.headline,
      color: theme.primary,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    primaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: spacing.touchMin,
      borderRadius: radii.full,
      marginRight: spacing.sm,
      backgroundColor: theme.primary,
    },
    actionBtnIcon: {
      marginRight: spacing.xs,
    },
    primaryActionText: {
      ...typography.label,
      color: theme.onPrimary,
    },
    secondaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: spacing.touchMin,
      borderRadius: radii.full,
      borderWidth: 1,
      backgroundColor: theme.surface,
      borderColor: theme.borderStrong,
    },
    secondaryActionText: {
      ...typography.label,
      color: theme.text,
    },
  }),
  iconColorText: theme.text,
  iconColorPrimaryText: theme.onPrimary,
});
