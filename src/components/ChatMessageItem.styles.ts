import { Platform, StyleSheet } from 'react-native';
import { ThemeColors, shapes, typography } from '../theme/colors';

export const getChatMessageItemStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    messageRow: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    messageRowAssistant: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '100%',
      paddingHorizontal: 22,
      paddingVertical: 20,
      borderRadius: shapes.xl,
      borderWidth: 1.5,
    },
    bubbleUser: {
      maxWidth: '85%',
      borderBottomRightRadius: shapes.sm,
      backgroundColor: theme.userBubble,
      borderColor: theme.userBubbleBorder,
    },
    bubbleAssistant: {
      width: '100%',
      borderBottomLeftRadius: shapes.xl,
      backgroundColor: theme.assistantBubble,
      borderColor: theme.assistantBubbleBorder,
    },
    bubbleAssistantWithProperties: {
      marginBottom: 14,
    },
    editorialTitle: {
      fontFamily: Platform.select({
        ios: 'Georgia',
        android: 'serif',
        default: 'serif',
      }),
      fontSize: 23,
      fontWeight: '700',
      marginBottom: 14,
      letterSpacing: -0.3,
      color: theme.primary,
    },
    assistantBadge: {
      ...typography.labelMD,
      fontSize: 13,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: theme.secondary,
    },
    messageText: {
      ...typography.bodyLG,
      fontSize: 17,
      lineHeight: 25,
      letterSpacing: 0.2,
      color: theme.text,
    },
    paragraphSpacing: {
      marginBottom: 14,
    },
    highlightedText: {
      fontWeight: '700',
      color: theme.secondary,
    },
    timestampText: {
      fontSize: 12,
      fontWeight: '500',
      alignSelf: 'flex-end',
      marginTop: 10,
      color: theme.textSecondary,
    },
    propertiesContainer: {
      width: '100%',
      marginTop: 4,
    },
    assistantColumn: {
      width: '100%',
    },
    propertyTimestamp: {
      marginTop: -8,
      marginBottom: 8,
      marginRight: 4,
    },
    resultsHeader: {
      ...typography.labelMD,
      fontSize: 13,
      textTransform: 'uppercase',
      marginBottom: 12,
      letterSpacing: 0.6,
      color: theme.textSecondary,
    },
  });
