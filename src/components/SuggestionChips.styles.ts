import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

export const getSuggestionChipsStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: 10,
    },
    scrollContent: {
      paddingHorizontal: spacing.marginMobile,
    },
    chip: {
      borderWidth: 1.5,
      borderRadius: shapes.full,
      paddingHorizontal: 18,
      paddingVertical: 12,
      marginRight: 10,
      minHeight: spacing.touchMin,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#1A3A34',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    chipDisabled: {
      opacity: 0.6,
    },
    chipText: {
      ...typography.labelMD,
      fontSize: 15,
      letterSpacing: 0.2,
      color: theme.text,
    },
    chipIconText: {
      color: theme.secondary,
    },
  });
