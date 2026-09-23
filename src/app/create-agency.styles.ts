import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme';

export const getCreateAgencyStyles = (theme: ThemeColors) =>
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
    fieldLabel: {
      ...typography.label,
      color: theme.text,
    },
    input: {
      ...typography.body,
      minHeight: spacing.touchDefault,
      paddingHorizontal: spacing.spaceMD,
      borderRadius: shapes.lg,
      borderWidth: 2,
      borderColor: theme.outline,
      backgroundColor: theme.surfaceContainerLowest,
      color: theme.text,
    },
    error: {
      ...typography.body,
      color: theme.error,
    },
  });
