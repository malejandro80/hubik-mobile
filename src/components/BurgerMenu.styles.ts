import { Platform, StyleSheet } from 'react-native';
import { ThemeColors, colors, shapes, spacing, typography } from '../theme/colors';

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
      backgroundColor: 'rgba(2, 36, 31, 0.45)',
    },
    drawerWrapper: {
      width: '82%',
      maxWidth: DRAWER_WIDTH,
      height: '100%',
    },
    drawerPanel: {
      flex: 1,
      borderLeftWidth: 1.5,
      borderLeftColor: theme.outlineVariant,
      backgroundColor: theme.background,
      paddingHorizontal: spacing.marginMobile,
      paddingVertical: 16,
      justifyContent: 'space-between',
      elevation: 16,
      shadowColor: theme.primary,
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
    },
    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.outlineVariant,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoBadge: {
      width: 32,
      height: 32,
      borderRadius: shapes.default,
      backgroundColor: theme.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    brandTitle: {
      fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: theme.primary,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: shapes.full,
      backgroundColor: theme.surfaceContainerHigh,
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
      paddingHorizontal: 16,
      height: spacing.touchMin,
      borderRadius: shapes.md,
      borderWidth: 1,
      borderColor: theme.outlineVariant,
      backgroundColor: theme.surfaceContainerLow,
      marginBottom: 10,
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
      marginRight: 12,
    },
    menuItemText: {
      ...typography.bodyLG,
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    badge: {
      backgroundColor: theme.secondaryContainer,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: shapes.full,
      marginRight: 8,
    },
    badgeText: {
      color: theme.onSecondaryContainer,
      fontSize: 11,
      fontWeight: '700',
    },
    drawerFooter: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.outlineVariant,
      alignItems: 'center',
    },
    versionText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.textSecondary,
    },
  });

export const styles = getBurgerMenuStyles(colors.light);
