import { StyleSheet } from 'react-native';
import { ThemeColors, shapes, spacing, typography } from '../theme';

export const PHOTO_ROW_HEIGHT = 96;
export const THUMB_SIZE = 72;

export const gestureRootStyle = { flex: 1 } as const;

export const getPhotoOrderModalStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.gutter,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.outlineVariant,
    },
    title: {
      ...typography.label,
      fontSize: 19,
      fontWeight: '700',
      color: theme.text,
    },
    headerButton: {
      minHeight: spacing.touchMin,
      minWidth: 84,
      paddingHorizontal: 16,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneButton: {
      backgroundColor: theme.primary,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    doneText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.onPrimary,
    },
    hint: {
      ...typography.body,
      fontSize: 15,
      color: theme.textSecondary,
      paddingHorizontal: spacing.gutter,
      paddingVertical: 12,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: spacing.gutter,
      paddingBottom: spacing.spaceLG,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      height: PHOTO_ROW_HEIGHT,
      marginBottom: 8,
      paddingHorizontal: 8,
      borderRadius: shapes.lg,
      borderWidth: 1.5,
      borderColor: theme.outlineVariant,
      backgroundColor: theme.card,
    },
    handle: {
      width: spacing.touchMin,
      height: spacing.touchMin,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: shapes.md,
      backgroundColor: theme.surfaceContainerLow,
    },
    rowText: {
      flex: 1,
      marginLeft: 12,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    coverLabel: {
      color: theme.secondary,
      fontWeight: '700',
    },
    moveButton: {
      width: spacing.touchMin,
      height: spacing.touchMin,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceContainerLow,
      marginLeft: 6,
    },
    moveButtonDisabled: {
      opacity: 0.35,
    },
  });
