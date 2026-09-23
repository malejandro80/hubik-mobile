import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme';

export const getIndexStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
    },
    photoGridWrapper: {
      paddingHorizontal: spacing.marginMobile,
    },
    listHeader: {
      alignItems: 'center',
      marginBottom: 8,
    },
    dateCapsule: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: shapes.full,
      marginTop: 8,
      marginBottom: 12,
      backgroundColor: theme.surfaceContainerHigh,
    },
    dateCapsuleText: {
      ...typography.label,
      fontSize: 13,
      fontWeight: '500',
      letterSpacing: 0.1,
      color: theme.textSecondary,
    },
    feedContent: {
      paddingHorizontal: spacing.marginMobile,
      paddingTop: 8,
      paddingBottom: 24,
    },
  });
