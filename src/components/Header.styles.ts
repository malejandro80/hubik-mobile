import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getHeaderStyles = (theme: ThemeColors) => ({
  styles: StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.background,
      borderBottomColor: theme.border,
    },
    circleButton: {
      width: spacing.touchMin,
      height: spacing.touchMin,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoBadge: {
      width: spacing.xxl,
      height: spacing.xxl,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
      backgroundColor: theme.primary,
    },
    brandTitle: {
      ...typography.title,
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
  homeIconColor: theme.onPrimary,
});
