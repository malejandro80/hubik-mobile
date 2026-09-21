import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing } from '../theme/colors';

export const getClientSearchResultsStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderRadius: shapes.md,
      borderWidth: 1.5,
      borderColor: theme.outlineVariant,
      backgroundColor: theme.card,
      overflow: 'hidden',
    },
    row: {
      minHeight: spacing.touchMin + 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.outlineVariant,
    },
    name: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    email: {
      fontSize: 15,
      color: theme.textSecondary,
      marginTop: 2,
    },
    message: {
      fontSize: 15,
      color: theme.textSecondary,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
  });
