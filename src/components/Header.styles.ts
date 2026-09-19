import { Platform, StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing } from '../theme/colors';

export const getHeaderStyles = (theme: ThemeColors) => ({
  styles: StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.marginMobile,
      paddingVertical: 12,
      borderBottomWidth: 1,
      backgroundColor: theme.background,
      borderBottomColor: theme.outlineVariant,
    },
    circleButton: {
      width: 48,
      height: 48,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceContainerHigh,
    },
    brandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoBadge: {
      width: 38,
      height: 38,
      borderRadius: shapes.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      backgroundColor: theme.secondary,
    },
    brandTitle: {
      fontFamily: Platform.select({
        ios: 'Georgia',
        android: 'serif',
        default: 'serif',
      }),
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.4,
      color: theme.primary,
    },
    srOnly: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
    },
  }),
  iconColor: theme.text,
  homeIconColor: theme.onSecondary,
});
