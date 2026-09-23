import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing } from '../theme';

export const getAmenitiesConfirmationStyles = (theme: ThemeColors) => ({
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
    emptyText: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 10,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.spaceXS,
      marginBottom: 10,
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
    chipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      marginRight: 6,
    },
    chipRemoveIcon: {
      marginLeft: 2,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.spaceXS,
    },
    input: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1.5,
      borderRadius: shapes.full,
      paddingHorizontal: 14,
      fontSize: 13,
      color: theme.text,
      borderColor: theme.outline,
      backgroundColor: theme.surface,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
  }),
  placeholderColor: theme.textSecondary,
  iconColor: theme.text,
  iconColorOnPrimary: theme.onPrimary,
});
