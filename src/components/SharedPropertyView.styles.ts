import { StyleSheet } from 'react-native';
import { SHARED_HERO_HEIGHT, SHARED_PAGE_MAX_WIDTH } from '../constants/share';
import { ThemeColors, shapes, spacing, typography } from '../theme';

export const getSharedPropertyViewStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      width: '100%',
      maxWidth: SHARED_PAGE_MAX_WIDTH,
      alignSelf: 'center',
      paddingHorizontal: spacing.gutter,
      paddingBottom: 32,
    },
    heroWrapper: {
      height: SHARED_HERO_HEIGHT,
      borderRadius: shapes.xl,
      overflow: 'hidden',
      backgroundColor: theme.surfaceContainerHigh,
      marginBottom: 18,
    },
    hero: {
      width: '100%',
      height: '100%',
    },
    noPhoto: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noPhotoText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    photoBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: shapes.full,
      backgroundColor: theme.background,
    },
    photoBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
    },
    price: {
      ...typography.label,
      fontSize: 32,
      fontWeight: '800',
      color: theme.primary,
    },
    title: {
      ...typography.label,
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginTop: 6,
    },
    address: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 4,
    },
    facts: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 16,
    },
    fact: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: shapes.full,
      backgroundColor: theme.surfaceContainerLow,
    },
    factText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    sectionTitle: {
      ...typography.label,
      fontSize: 19,
      fontWeight: '700',
      color: theme.text,
      marginTop: 24,
      marginBottom: 8,
    },
    description: {
      ...typography.body,
      fontSize: 16,
      lineHeight: 24,
      color: theme.text,
    },
    listedBy: {
      fontSize: 15,
      color: theme.textSecondary,
      marginTop: 20,
    },
  });
