import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

export const getSharedPageStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    topBar: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: spacing.gutter,
      borderBottomWidth: 1,
      borderBottomColor: theme.outlineVariant,
    },
    logo: {
      width: 32,
      height: 32,
      borderRadius: shapes.md,
    },
    brand: {
      ...typography.labelLG,
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 16,
      paddingBottom: 24,
    },
    message: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 48,
      alignItems: 'center',
      gap: 10,
    },
    messageTitle: {
      ...typography.labelLG,
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    messageText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      minHeight: spacing.touchMin,
      paddingHorizontal: 24,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      marginTop: 8,
    },
    retryText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.onPrimary,
    },
  });
