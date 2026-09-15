import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChatMessage, Property } from '../types/property';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors } from '../theme/colors';
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

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: theme.primary }]
              : [
                  styles.bubbleAssistant,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ],
          ]}
        >
          {!isUser && (
            <Text style={styles.assistantBadge}>🤖 Hubik Assistant</Text>
          )}
          <Text
            style={[
              styles.messageText,
              { color: isUser ? '#FFFFFF' : theme.text },
            ]}
          >
            {message.text}
          </Text>

          {/* Render Property Cards within Assistant Responses */}
          {message.properties && message.properties.length > 0 && (
            <View style={styles.propertiesContainer}>
              <Text
                style={[
                  styles.resultsHeader,
                  { color: colorScheme === 'dark' ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                Matching Properties ({message.properties.length}):
              </Text>
              {message.properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onPress={onPropertyPress}
                />
              ))}
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
    marginBottom: 16,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: 16,
    padding: 14,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  assistantBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  propertiesContainer: {
    marginTop: 14,
  },
  resultsHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
});
