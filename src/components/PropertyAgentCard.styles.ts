import { shapes, ThemeColors } from '../theme/colors';

export const getPropertyAgentCardStyles = (theme: ThemeColors) => ({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.surfaceContainer,
    borderRadius: shapes.lg,
    borderWidth: 1,
    borderColor: theme.outline,
    padding: 16,
    marginVertical: 14,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.primaryText,
  },
  textContainer: {
    flex: 1,
  },
  attributionPrompt: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: theme.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  attributionName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.text,
  },
  agencySubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
});
