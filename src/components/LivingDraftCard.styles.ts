import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing } from '../theme';

export const getLivingDraftCardStyles = (theme: ThemeColors) => ({
  styles: StyleSheet.create({
    container: {
      marginTop: 8,
      marginBottom: 8,
      borderRadius: shapes.lg,
      borderWidth: 1.5,
      padding: 16,
      backgroundColor: theme.surfaceContainer,
      borderColor: theme.border,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 10,
      color: theme.primary,
    },
    knownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    knownIcon: {
      marginRight: 8,
    },
    knownLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginRight: 4,
      color: theme.textSecondary,
    },
    knownValue: {
      fontSize: 14,
      flexShrink: 1,
      color: theme.text,
    },
    missingSection: {
      marginTop: 8,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.spaceXS,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderRadius: shapes.full,
      paddingHorizontal: 14,
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: theme.badgeBackground,
      borderColor: theme.outline,
    },
    chipExpanded: {
      borderColor: theme.secondary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
    },
    pickerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.spaceXS,
      marginTop: 8,
      width: '100%',
    },
    pickerChip: {
      borderWidth: 1.5,
      borderRadius: shapes.full,
      paddingHorizontal: 16,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    pickerChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.onPrimary,
    },
  }),
  checkmarkColor: theme.secondary,
});
