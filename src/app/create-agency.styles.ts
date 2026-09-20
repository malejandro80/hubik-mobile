import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

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
      ...typography.headlineLG,
      color: theme.text,
    },
    subtitle: {
      ...typography.bodyLG,
      color: theme.textSecondary,
    },
    fieldLabel: {
      ...typography.labelLG,
      color: theme.text,
    },
    input: {
      ...typography.bodyLG,
      minHeight: spacing.touchDefault,
      paddingHorizontal: spacing.spaceMD,
      borderRadius: shapes.lg,
      borderWidth: 2,
      borderColor: theme.outline,
      backgroundColor: theme.surfaceContainerLowest,
      color: theme.text,
    },
    error: {
      ...typography.bodyMD,
      color: theme.error,
    },
  });
