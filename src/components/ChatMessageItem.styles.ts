import { StyleSheet } from 'react-native';
import { ThemeColors, radii, spacing, typography } from '../theme';

export const getChatMessageItemStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    messageRow: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    messageRowAssistant: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '100%',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
    },
    bubbleUser: {
      maxWidth: '85%',
      borderBottomRightRadius: radii.sm,
      backgroundColor: theme.userBubble,
    },
    bubbleAssistant: {
      width: '100%',
      paddingHorizontal: 0,
      backgroundColor: theme.background,
    },
    bubbleAssistantWithProperties: {
      marginBottom: spacing.md,
    },
    editorialTitle: {
      ...typography.title,
      marginBottom: spacing.sm,
      color: theme.primary,
    },

    messageText: {
      ...typography.body,
      color: theme.text,
    },
    paragraphSpacing: {
      marginBottom: spacing.md,
    },
    highlightedText: {
      ...typography.bodyStrong,
      color: theme.secondary,
    },
    timestampText: {
      ...typography.caption,
      alignSelf: 'flex-end',
      marginTop: spacing.xs,
      color: theme.textTertiary,
    },
    propertiesContainer: {
      width: '100%',
      marginTop: spacing.xs,
    },
    assistantColumn: {
      width: '100%',
    },
    propertyTimestamp: {
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
      marginRight: spacing.xs,
    },
    resultsHeader: {
      ...typography.caption,
      textTransform: 'uppercase',
      marginBottom: spacing.md,
      letterSpacing: 0.8,
      color: theme.textSecondary,
    },
  });
