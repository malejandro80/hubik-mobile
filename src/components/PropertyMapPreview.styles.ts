import { shapes, ThemeColors } from '../theme/colors';

export const getPropertyMapPreviewStyles = (theme: ThemeColors) => ({
  container: {
    height: 180,
    borderRadius: shapes.lg,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: theme.outline,
    backgroundColor: theme.surfaceContainer,
    marginVertical: 14,
    position: 'relative' as const,
  },
  webview: {
    flex: 1,
    backgroundColor: theme.surfaceContainer,
  },
  badge: {
    position: 'absolute' as const,
    top: 10,
    left: 10,
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: shapes.sm,
    borderWidth: 1,
    borderColor: theme.outline,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.textSecondary,
  },
});
