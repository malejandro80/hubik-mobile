import { StyleSheet } from 'react-native';
import { ThemeColors, shapes } from '../theme';

export const getChatMapPickerStyles = (theme: ThemeColors) => ({
  styles: StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    webview: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceContainerLow,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 15,
      color: theme.textSecondary,
    },
    footer: {
      padding: 16,
    },
    confirmButton: {
      height: 52,
      borderRadius: shapes.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    confirmButtonText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
  }),
  iconColor: theme.text,
  primaryColor: theme.primary,
});
