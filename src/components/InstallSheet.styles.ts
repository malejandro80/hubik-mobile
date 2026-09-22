import { StyleSheet } from 'react-native';
import { INSTALL_SHEET_BACKDROP_COLOR, INSTALL_SHEET_MAX_WIDTH } from '../constants/share';
import { ThemeColors, shapes, spacing, typography } from '../theme/colors';

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

export const getInstallSheetStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      ...FILL,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...FILL,
      backgroundColor: INSTALL_SHEET_BACKDROP_COLOR,
    },
    sheet: {
      width: '100%',
      maxWidth: INSTALL_SHEET_MAX_WIDTH,
      alignSelf: 'center',
      paddingHorizontal: spacing.gutter,
      paddingTop: 12,
      paddingBottom: 28,
      borderTopLeftRadius: shapes.xl,
      borderTopRightRadius: shapes.xl,
      backgroundColor: theme.background,
      alignItems: 'center',
    },
    grabber: {
      width: 44,
      height: 5,
      borderRadius: shapes.full,
      backgroundColor: theme.outlineVariant,
      marginBottom: 16,
    },
    icon: {
      width: 64,
      height: 64,
      borderRadius: shapes.lg,
      marginBottom: 14,
    },
    title: {
      ...typography.labelLG,
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.bodyLG,
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 20,
    },
    primaryButton: {
      width: '100%',
      minHeight: 52,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryText: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.onPrimary,
    },
    outlineButton: {
      width: '100%',
      minHeight: 52,
      borderRadius: shapes.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.primary,
      marginTop: 10,
    },
    outlineButtonDisabled: {
      opacity: 0.5,
    },
    outlineText: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.primary,
    },
    openHint: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 10,
    },
    secondaryButton: {
      width: '100%',
      minHeight: spacing.touchMin + 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    secondaryText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.textSecondary,
    },
  });
