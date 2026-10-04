import { StyleSheet } from 'react-native';
import { ASK_THREAD_MAX_HEIGHT } from '../constants/propertyAsk';
import { ThemeColors, shapes, spacing, typography } from '../theme';

export const getPropertyAskThreadStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    list: {
      maxHeight: ASK_THREAD_MAX_HEIGHT,
    },
    content: {
      paddingVertical: spacing.sm,
      gap: spacing.md,
    },
    turn: {
      gap: spacing.sm,
    },
    question: {
      ...typography.body,
      alignSelf: 'flex-end',
      maxWidth: '85%',
      color: theme.text,
      backgroundColor: theme.userBubble,
      borderColor: theme.userBubbleBorder,
      borderWidth: 1,
      borderRadius: shapes.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    reply: {
      alignSelf: 'flex-start',
      maxWidth: '92%',
      backgroundColor: theme.assistantBubble,
      borderColor: theme.assistantBubbleBorder,
      borderWidth: 1,
      borderRadius: shapes.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    replyText: {
      ...typography.body,
      color: theme.text,
    },
    thinking: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    mutedText: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    errorText: {
      ...typography.body,
      color: theme.error,
    },
    options: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    option: {
      minHeight: spacing.touchMin,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      borderRadius: shapes.full,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.secondaryContainer,
    },
    optionText: {
      ...typography.label,
      color: theme.onSecondaryContainer,
    },
    paragraphSpacing: {
      marginBottom: spacing.xs,
    },
    highlightedText: {
      fontWeight: '700',
    },
  });
