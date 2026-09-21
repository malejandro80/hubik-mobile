import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing } from '../theme/colors';

export const getSlashCommandMenuStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginHorizontal: spacing.gutter,
      marginBottom: 8,
      borderRadius: shapes.lg,
      borderWidth: 1.5,
      borderColor: theme.outlineVariant,
      backgroundColor: theme.card,
      overflow: 'hidden',
    },
    row: {
      minHeight: 56,
      paddingHorizontal: 16,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    command: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
    },
    hint: {
      fontSize: 15,
      color: theme.textSecondary,
      marginTop: 2,
    },
    note: {
      fontSize: 15,
      color: theme.textSecondary,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
  });
