import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
              ? [
                  styles.bubbleUser,
                  {
                    backgroundColor: theme.userBubble,
                    borderColor: theme.userBubbleBorder,
                  },
                ]
              : [
                  styles.bubbleAssistant,
                  {
                    backgroundColor: theme.assistantBubble,
                    borderColor: theme.assistantBubbleBorder,
                  },
                ],
          ]}
        >
          {!isUser && (
            <Text style={[styles.assistantBadge, { color: theme.secondary }]}>
              🤖 Asistente Hubik
            </Text>
          )}
          <Text
            style={[
              styles.messageText,
              { color: theme.text },
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
                  { color: theme.textSecondary },
                ]}
              >
                Propiedades Encontradas ({message.properties.length}):
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
    marginBottom: 20,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '90%',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: shapes.xl, // 24px
    borderWidth: 1.5,
  },
  bubbleUser: {
    borderBottomRightRadius: shapes.sm, // 4px
  },
  bubbleAssistant: {
    borderBottomLeftRadius: shapes.sm, // 4px
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
    letterSpacing: 0.2,
  },
  propertiesContainer: {
    marginTop: 18,
  },
  resultsHeader: {
    ...typography.labelMD,
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.6,
  },
});
