import { StyleSheet } from 'react-native';
import { spacing, ThemeColors, typography } from '../theme';

export const getPropertyDescriptionSectionStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.title,
      marginBottom: spacing.md,
      color: theme.text,
    },
    block: {
      paddingVertical: spacing.xs,
    },
    paragraph: {
      ...typography.body,
      color: theme.text,
    },
    paragraphSecondary: {
      ...typography.body,
      fontStyle: 'italic',
      color: theme.textSecondary,
    },
  });
