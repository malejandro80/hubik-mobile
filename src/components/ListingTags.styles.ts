import { StyleSheet } from 'react-native';
import { ThemeColors, shapes } from '../theme';

export const getListingTagsStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    highlightTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: shapes.sm,
      backgroundColor: theme.secondaryContainer,
    },
    highlightTagText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.onSecondaryContainer,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: shapes.sm,
      borderWidth: 1.5,
      backgroundColor: theme.surfaceContainer,
      borderColor: theme.outline,
    },
    tagText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
  });
