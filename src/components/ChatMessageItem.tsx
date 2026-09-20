import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { ChatMessage, Property } from '../types/property';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme/colors';
import { PropertyCard } from './PropertyCard';
import { getChatMessageItemStyles } from './ChatMessageItem.styles';

import { parseMessageParagraphs } from '../lib/messageParser';
export type { MessageParagraph, MessageSegment } from '../lib/messageParser';

interface ChatMessageItemProps {
  message: ChatMessage;
  onPropertyPress?: (property: Property) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  ({ message, onPropertyPress }) => {
    const colorScheme = useColorScheme();
    const theme = colors[colorScheme];
    const labels = useLabels();
    const styles = useMemo(() => getChatMessageItemStyles(theme), [theme]);

    const isUser = message.sender === 'user';
    const hasProperties = Boolean(message.properties && message.properties.length > 0);
    const hasText = Boolean(
      message.title || (message.text && message.text.trim().length > 0)
    );

    const parsedParagraphs = useMemo(
      () => parseMessageParagraphs(message.text),
      [message.text]
    );

    const renderBodyContent = () =>
      parsedParagraphs.map((paragraph, pIndex) => (
        <Text
          key={pIndex}
          style={[
            styles.messageText,
            pIndex < parsedParagraphs.length - 1 ? styles.paragraphSpacing : null,
          ]}
        >
          {paragraph.segments.map((segment, sIndex) =>
            segment.isBold ? (
              <Text key={sIndex} style={styles.highlightedText}>
                {segment.text}
              </Text>
            ) : (
              segment.text
            )
          )}
        </Text>
      ));

    if (isUser) {
      return (
        <View style={[styles.messageRow, styles.messageRowUser]}>
          <View style={[styles.bubble, styles.bubbleUser]}>
            {renderBodyContent()}
            {message.timestamp ? (
              <Text style={styles.timestampText}>
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
          {hasText && (
            <View
              style={[
                styles.bubble,
                styles.bubbleAssistant,
                hasProperties && styles.bubbleAssistantWithProperties,
              ]}
            >
              {message.title && (
                <Text style={styles.editorialTitle}>
                  {message.title}
                </Text>
              )}

              {!message.title && (
                <Text style={styles.assistantBadge}>
                  {labels.chat.assistantBadge}
                </Text>
              )}

              {renderBodyContent()}

              {message.timestamp && !hasProperties ? (
                <Text style={styles.timestampText}>
                  {message.timestamp}
                </Text>
              ) : null}
            </View>
          )}

          {hasProperties && (
            <View style={styles.propertiesContainer}>
              <Text style={styles.resultsHeader}>
                {labels.chat.propertiesFound(message.properties!.length)}
              </Text>
              {message.properties!.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onPress={onPropertyPress}
                />
              ))}
              {message.timestamp ? (
                <Text style={[styles.timestampText, styles.propertyTimestamp]}>
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
