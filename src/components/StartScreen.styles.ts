import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

export const CARD_MIN_HEIGHT = 64;

export const getStartScreenStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.gutter,
      paddingTop: 16,
      paddingBottom: 24,
    },
    greeting: {
      ...typography.labelLG,
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
    },
    subtitle: {
      ...typography.bodyLG,
      fontSize: 18,
      color: theme.textSecondary,
      marginTop: 4,
      marginBottom: 20,
    },
    groupTitle: {
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.textSecondary,
      marginBottom: 10,
    },
    group: {
      marginBottom: 22,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: CARD_MIN_HEIGHT,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 10,
      borderRadius: shapes.lg,
      borderWidth: 1.5,
      borderColor: theme.outlineVariant,
      backgroundColor: theme.card,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.secondaryContainer,
      marginRight: 14,
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    cardSubtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      marginTop: 2,
    },
    example: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.touchMin,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginBottom: 8,
      borderRadius: shapes.full,
      backgroundColor: theme.surfaceContainerLow,
    },
    exampleText: {
      flex: 1,
      fontSize: 16,
      color: theme.text,
      marginLeft: 10,
    },
    micHint: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
