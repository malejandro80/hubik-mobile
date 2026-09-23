import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const CARD_MIN_HEIGHT = 64;

export const getStartScreenStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
    greeting: {
      ...typography.display,
      color: theme.text,
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    groupTitle: {
      ...typography.caption,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.textTertiary,
      marginBottom: spacing.sm,
    },
    group: {
      marginBottom: spacing.xl,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: CARD_MIN_HEIGHT,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    cardIcon: {
      width: spacing.touchMin - spacing.xs,
      height: spacing.touchMin - spacing.xs,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.secondaryContainer,
      marginRight: spacing.md,
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      ...typography.bodyStrong,
      color: theme.text,
    },
    cardSubtitle: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    example: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.touchMin,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radii.full,
      backgroundColor: theme.surfaceMuted,
    },
    exampleText: {
      ...typography.body,
      flex: 1,
      color: theme.text,
      marginLeft: spacing.sm,
    },
    micHint: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
