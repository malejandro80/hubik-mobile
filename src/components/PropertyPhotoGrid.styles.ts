import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing } from '../theme/colors';

const CELL_GAP = spacing.spaceXS;

export const getPropertyPhotoGridStyles = (theme: ThemeColors) => ({
  styles: StyleSheet.create({
    container: {
      marginTop: 8,
      marginBottom: 8,
    },
    row: {
      gap: CELL_GAP,
      marginBottom: CELL_GAP,
    },
    cell: {
      flex: 1 / 3,
      aspectRatio: 1,
      borderRadius: shapes.md,
      overflow: 'hidden',
      position: 'relative',
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    coverBadge: {
      position: 'absolute',
      left: 6,
      bottom: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: shapes.full,
      backgroundColor: theme.primary,
    },
    coverBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    removeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 28,
      height: 28,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    moveButtonRow: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      flexDirection: 'row',
      gap: 4,
    },
    moveButton: {
      width: 28,
      height: 28,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    moveButtonDisabled: {
      opacity: 0.35,
    },
    addCell: {
      flex: 1 / 3,
      aspectRatio: 1,
      borderRadius: shapes.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      borderColor: theme.outline,
    },
    addCellText: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
      color: theme.secondary,
    },
  }),
  addIconColor: theme.secondary,
});
