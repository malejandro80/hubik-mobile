import { StyleSheet } from 'react-native';
import { INSTALL_SHEET_MAX_WIDTH } from '../constants/share';
import { ThemeColors, shapes, spacing } from '../theme/colors';

export const getInstallBarStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    bar: {
      width: '100%',
      maxWidth: INSTALL_SHEET_MAX_WIDTH,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: spacing.gutter,
      paddingRight: 8,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme.outlineVariant,
      backgroundColor: theme.card,
    },
    text: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    button: {
      minHeight: spacing.touchMin,
      paddingHorizontal: 20,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.onPrimary,
    },
  });
