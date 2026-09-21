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
    },
    summary: {
      flex: 1,
      minHeight: spacing.touchMin,
      justifyContent: 'center',
      paddingRight: 10,
    },
    summaryLine: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    progress: {
      ...typography.labelLG,
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    summaryPart: {
      fontSize: 13,
      color: theme.textSecondary,
      marginLeft: 8,
    },
    hint: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.secondary,
      marginTop: 2,
    },
    topSuggestion: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    chevron: {
      marginLeft: 6,
    },
    publishButton: {
      minHeight: spacing.touchMin,
      minWidth: 108,
      paddingHorizontal: 20,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    previewButton: {
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
