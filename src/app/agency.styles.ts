import { StyleSheet } from 'react-native';
import { ThemeColors, spacing, typography } from '../theme/colors';

export const getAgencyStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    body: {
      flex: 1,
    },
    list: {
      paddingHorizontal: spacing.gutter,
      paddingBottom: spacing.spaceLG,
      gap: spacing.spaceMD,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.margin,
      gap: spacing.spaceMD,
    },
    statusBlock: {
      alignItems: 'center',
      paddingVertical: spacing.spaceLG,
      gap: spacing.spaceMD,
    },
    message: {
      ...typography.bodyLG,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
