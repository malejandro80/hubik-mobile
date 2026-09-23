import { StyleSheet } from 'react-native';
import { ThemeColors, colors, elevation, radii, spacing, typography } from '../theme';

export const DRAWER_WIDTH = 340;

export const getBurgerMenuStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: theme.scrim,
    },
    drawerWrapper: {
      width: '82%',
      maxWidth: DRAWER_WIDTH,
      height: '100%',
    },
    drawerPanel: {
      ...elevation('overlay', theme),
      flex: 1,
      backgroundColor: theme.background,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      justifyContent: 'space-between',
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoBadge: {
      width: spacing.xxl,
      height: spacing.xxl,
      borderRadius: radii.sm,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    brandTitle: {
      ...typography.title,
      color: theme.primary,
    },
    closeButton: {
      width: spacing.touchMin,
      height: spacing.touchMin,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemsContainer: {
      flex: 1,
    },
    menuItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      minHeight: spacing.touchDefault,
      borderRadius: radii.md,
      marginBottom: spacing.xs,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemIcon: {
      marginRight: spacing.md,
    },
    menuItemText: {
      ...typography.body,
      color: theme.text,
    },
    badge: {
      backgroundColor: theme.secondaryContainer,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      marginRight: spacing.sm,
    },
    badgeText: {
      ...typography.caption,
      color: theme.onSecondaryContainer,
    },
    drawerFooter: {
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      alignItems: 'center',
    },
    versionText: {
      ...typography.caption,
      color: theme.textTertiary,
    },
  });

export const styles = getBurgerMenuStyles(colors.light);
