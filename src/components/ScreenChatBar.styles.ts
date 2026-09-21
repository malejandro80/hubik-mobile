import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing } from '../theme/colors';

export const getScreenChatBarStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    replyStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: shapes.lg,
      borderWidth: 1.5,
      borderColor: theme.outlineVariant,
      backgroundColor: theme.card,
    },
    replyText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 21,
      color: theme.text,
    },
    openButton: {
      minHeight: spacing.touchMin,
      paddingHorizontal: 12,
      marginLeft: 8,
      justifyContent: 'center',
    },
    openText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.secondary,
    },
  });
