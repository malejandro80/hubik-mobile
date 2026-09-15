import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ChatMessage, Property } from '../types/property';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors, shapes, typography } from '../theme/colors';
import { PropertyCard } from './PropertyCard';

interface ChatMessageItemProps {
  message: ChatMessage;
  onPropertyPress?: (property: Property) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  ({ message, onPropertyPress }) => {
    const colorScheme = useColorScheme();
    const theme = colors[colorScheme];
    const isUser = message.sender === 'user';

    const hasProperties = Boolean(message.properties && message.properties.length > 0);
    const hasText = Boolean(
      message.title || (message.text && message.text.trim().length > 0)
    );

    const renderBodyContent = () => {
      const paragraphs = message.text.split('\n\n');
      return paragraphs.map((para, pIndex) => {
        const hasBold = para.includes('**');
        const parts = hasBold ? para.split(/(\*\*[^*]+\*\*)/g) : null;

        return (
          <Text
            key={pIndex}
            style={[
              styles.messageText,
              { color: theme.text },
              pIndex < paragraphs.length - 1 ? styles.paragraphSpacing : null,
            ]}
          >
            {hasBold && parts
              ? parts.map((part, index) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    const inner = part.slice(2, -2);
                    return (
                      <Text
                        key={index}
                        style={[styles.highlightedText, { color: theme.secondary }]}
                      >
                        {inner}
                      </Text>
                    );
                  }
                  return part;
                })
              : para}
          </Text>
        );
      });
    };

    if (isUser) {
      return (
        <View style={[styles.messageRow, styles.messageRowUser]}>
          <View
            style={[
              styles.bubble,
              styles.bubbleUser,
              {
                backgroundColor: theme.userBubble,
                borderColor: theme.userBubbleBorder,
              },
            ]}
          >
            {renderBodyContent()}
            {message.timestamp ? (
              <Text
                style={[
                  styles.timestampText,
                  { color: theme.textSecondary },
                ]}
              >
                {message.timestamp}
              </Text>
            ) : null}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, styles.messageRowAssistant]}>
        <View style={styles.assistantColumn}>
          {/* Assistant Text Bubble */}
          {hasText && (
            <View
              style={[
                styles.bubble,
                styles.bubbleAssistant,
                {
                  backgroundColor: theme.assistantBubble,
                  borderColor: theme.assistantBubbleBorder,
                  marginBottom: hasProperties ? 14 : 0,
                },
              ]}
            >
              {/* Editorial Title for Featured / Welcome Assistant Messages */}
              {message.title && (
                <Text style={[styles.editorialTitle, { color: theme.primary }]}>
                  {message.title}
                </Text>
              )}

              {/* Standard Assistant Badge when no custom title is defined */}
              {!message.title && (
                <Text style={[styles.assistantBadge, { color: theme.secondary }]}>
                  🤖 Asistente Hubik
                </Text>
              )}

              {/* Formatted Body Content */}
              {renderBodyContent()}

              {/* Bottom Timestamp when no properties */}
              {message.timestamp && !hasProperties ? (
                <Text
                  style={[
                    styles.timestampText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {message.timestamp}
                </Text>
              ) : null}
            </View>
          )}

          {/* Standalone Properties Container - OUTSIDE the speech bubble to eliminate double border */}
          {hasProperties && (
            <View style={styles.propertiesContainer}>
              <Text
                style={[
                  styles.resultsHeader,
                  { color: theme.textSecondary },
                ]}
              >
                Propiedades Encontradas ({message.properties!.length}):
              </Text>
              {message.properties!.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onPress={onPropertyPress}
                />
              ))}
              {message.timestamp ? (
                <Text
                  style={[
                    styles.timestampText,
                    styles.propertyTimestamp,
                    { color: theme.textSecondary },
                  ]}
                >
                  {message.timestamp}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    );
  }
);

ChatMessageItem.displayName = 'ChatMessageItem';

const styles = StyleSheet.create({
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
    borderRadius: shapes.xl, // 24px
    borderWidth: 1.5,
  },
  bubbleUser: {
    maxWidth: '85%',
    borderBottomRightRadius: shapes.sm, // 4px
  },
  bubbleAssistant: {
    width: '100%',
    borderBottomLeftRadius: shapes.xl, // Rounded 24px card matching mockup
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
  },
  assistantBadge: {
    ...typography.labelMD,
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageText: {
    ...typography.bodyLG,
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: 0.2,
  },
  paragraphSpacing: {
    marginBottom: 14,
  },
  highlightedText: {
    fontWeight: '700',
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '500',
    alignSelf: 'flex-end',
    marginTop: 10,
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
  },
});
