import { shapes, ThemeColors } from '../theme/colors';

export const getPropertyStatsBarStyles = (theme: ThemeColors) => ({
  container: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginVertical: 10,
  },
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.surfaceContainer,
    borderColor: theme.outline,
    borderWidth: 1,
    borderRadius: shapes.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.text,
  },
});
