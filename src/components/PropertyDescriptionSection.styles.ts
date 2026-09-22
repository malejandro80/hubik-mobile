import { Platform } from 'react-native';
import { ThemeColors } from '../theme/colors';

export const getPropertyDescriptionSectionStyles = (theme: ThemeColors) => ({
  container: {
    marginBottom: 26,
  },
  title: {
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    marginBottom: 16,
    color: theme.primary,
  },
  block: {
    paddingVertical: 4,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.text,
  },
  paragraphSecondary: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic' as const,
    color: theme.textSecondary,
  },
});
