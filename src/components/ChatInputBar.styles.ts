import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getChatInputBarStyles = (theme: ThemeColors) => ({
  styles: StyleSheet.create({
    wrapper: {
      backgroundColor: theme.background,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    inputCapsule: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: spacing.touchDefault,
      borderRadius: radii.full,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
      backgroundColor: theme.surface,
      borderColor: theme.borderStrong,
    },
    inputCapsuleFocused: {
      borderColor: theme.primary,
    },
    input: {
      flex: 1,
      paddingHorizontal: 0,
      paddingVertical: 0,
      ...typography.body,
      height: '100%',
      color: theme.text,
    },
    actionButton: {
      width: spacing.touchDefault,
      height: spacing.touchDefault,
      borderRadius: radii.full,
      marginLeft: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    actionButtonRecording: {
      backgroundColor: theme.error,
    },
    srOnly: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
    },
  }),
  placeholderTextColor: theme.textTertiary,
  iconColor: theme.onPrimary,
});
