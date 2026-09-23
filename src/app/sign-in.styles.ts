import { StyleSheet } from 'react-native';
import { ThemeColors, spacing, typography } from '../theme';

export const getSignInStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.margin,
      gap: spacing.spaceMD,
    },
    title: {
      ...typography.title,
      color: theme.text,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
    },
    error: {
      ...typography.body,
      color: theme.error,
    },
  });
