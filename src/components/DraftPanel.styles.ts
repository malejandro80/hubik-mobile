import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

export const getDraftPanelStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.outlineVariant,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.touchMin,
      paddingVertical: 4,
    },
    progressBadge: {
      width: 36,
      height: 36,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceContainerHigh,
      marginRight: 10,
    },
    progressBadgeReady: {
      backgroundColor: theme.secondary,
    },
    progressBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.onSurfaceVariant,
    },
    headerText: {
      flex: 1,
    },
    progress: {
      ...typography.labelLG,
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    hint: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.secondary,
      marginTop: 2,
    },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
      marginBottom: 10,
    },
    chip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: spacing.touchMin,
      paddingHorizontal: 10,
      borderRadius: shapes.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.outlineVariant,
      backgroundColor: theme.surfaceContainerLow,
      gap: 6,
    },
    chipDone: {
      borderStyle: 'solid',
      borderColor: theme.secondary,
      backgroundColor: theme.surfaceContainerLowest,
    },
    chipText: {
      flex: 1,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    chipHint: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 1,
    },
    chipAction: {
      minWidth: 32,
      minHeight: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    publishButton: {
      flex: 1,
      minHeight: spacing.touchMin,
      paddingHorizontal: 20,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    previewButton: {
      flex: 1,
      minHeight: spacing.touchMin,
      paddingHorizontal: 18,
      borderRadius: shapes.full,
      borderWidth: 1.5,
      borderColor: theme.secondary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    previewButtonDisabled: {
      opacity: 0.45,
    },
    publishButtonDisabled: {
      opacity: 0.45,
    },
    publishText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.onPrimary,
    },
    body: {
      marginTop: 6,
    },
    section: {
      paddingVertical: 10,
    },
    sectionTitle: {
      ...typography.labelLG,
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    suggestionText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      marginLeft: 8,
    },
    pinRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pinText: {
      flex: 1,
      fontSize: 14,
      color: theme.textSecondary,
    },
    pillButton: {
      minHeight: spacing.touchMin,
      paddingHorizontal: 18,
      borderRadius: shapes.full,
      borderWidth: 1.5,
      borderColor: theme.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.secondary,
    },
    descriptionText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.text,
      marginBottom: 8,
    },
    mutedText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: theme.error,
      marginBottom: 8,
    },
  });
