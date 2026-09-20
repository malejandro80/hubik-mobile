import { StyleSheet } from 'react-native';
import { ThemeColors, spacing, typography } from '../theme/colors';

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
      ...typography.headlineLG,
      color: theme.text,
    },
    subtitle: {
      ...typography.bodyLG,
      color: theme.textSecondary,
    },
    error: {
      ...typography.bodyMD,
      color: theme.error,
    },
  });
