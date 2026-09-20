import { StyleSheet } from 'react-native';
import { ThemeColors, typography } from '../theme/colors';

export const getChatInputBarStyles = (theme: ThemeColors) => ({
  styles: StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.background,
    },
    containerTopBorder: {
      borderTopWidth: 1,
      borderTopColor: theme.outlineVariant,
    },
    inputCapsule: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      borderRadius: 28,
      borderWidth: 1.5,
      paddingHorizontal: 20,
      backgroundColor: theme.surfaceContainerLow,
      borderColor: theme.outlineVariant,
    },
    inputCapsuleFocused: {
      borderColor: theme.secondary,
    },
    input: {
      flex: 1,
      paddingHorizontal: 0,
      paddingVertical: 0,
      ...typography.bodyLG,
      fontSize: 16,
      height: '100%',
      color: theme.text,
    },
    actionButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginLeft: 10,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#02241F',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
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
  placeholderTextColor: theme.textSecondary,
  iconColor: theme.onPrimary,
});
