import { StyleSheet } from 'react-native';
import { INSTALL_SHEET_MAX_WIDTH } from '../constants/share';
import { ThemeColors, elevation, radii, spacing, typography } from '../theme';

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

export const getInstallSheetStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      ...FILL,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...FILL,
      backgroundColor: theme.scrim,
    },
    sheet: {
      ...elevation('overlay', theme),
      width: '100%',
      maxWidth: INSTALL_SHEET_MAX_WIDTH,
      alignSelf: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      backgroundColor: theme.background,
      alignItems: 'center',
    },
    grabber: {
      width: spacing.xxl,
      height: spacing.xs,
      borderRadius: radii.full,
      backgroundColor: theme.border,
      marginBottom: spacing.lg,
    },
    icon: {
      width: 64,
      height: 64,
      borderRadius: radii.lg,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.title,
      color: theme.text,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    primaryButton: {
      width: '100%',
      minHeight: spacing.touchDefault,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryText: {
      ...typography.label,
      color: theme.onPrimary,
    },
    outlineButton: {
      width: '100%',
      minHeight: spacing.touchDefault,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.primary,
      marginTop: spacing.sm,
    },
    outlineButtonDisabled: {
      opacity: 0.5,
    },
    outlineText: {
      ...typography.label,
      color: theme.primary,
    },
    openHint: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    secondaryButton: {
      width: '100%',
      minHeight: spacing.touchDefault,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    secondaryText: {
      ...typography.label,
      color: theme.textSecondary,
    },
  });
