import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme';
import { AskTurn } from '../types/propertyAsk';
import { getPropertyAskThreadStyles } from './PropertyAskThread.styles';

export interface PropertyAskThreadProps {
  turns: AskTurn[];
  pending: boolean;
  onChoose: (option: string) => void;
}

export function PropertyAskThread({ turns, pending, onChoose }: PropertyAskThreadProps) {
  const { propertyAsk } = useLabels();
  const theme = colors[useColorScheme()];
  const styles = useMemo(() => getPropertyAskThreadStyles(theme), [theme]);

  if (turns.length === 0) return null;

  const renderReply = (turn: AskTurn) => {
    if (turn.status === 'pending') {
      return (
        <View style={styles.thinking}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.mutedText}>{propertyAsk.thinking}</Text>
        </View>
      );
    }
    if (turn.status === 'error') return <Text style={styles.errorText}>{propertyAsk.error}</Text>;
    if (turn.status === 'clarify' && turn.clarify) {
      return (
        <>
          <Text style={styles.replyText}>{turn.clarify.question}</Text>
          <View style={styles.options}>
            {turn.clarify.options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.option}
                onPress={() => onChoose(option)}
                disabled={pending}
                accessibilityRole="button"
                accessibilityLabel={propertyAsk.optionA11y(option)}
                accessibilityState={{ disabled: pending }}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.mutedText}>{propertyAsk.otherHint}</Text>
        </>
      );
    }
    return <Text style={styles.replyText}>{turn.answer}</Text>;
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={turns}
      keyExtractor={(turn) => turn.id}
      accessibilityLabel={propertyAsk.threadA11y}
      renderItem={({ item }) => (
        <View style={styles.turn}>
          <Text style={styles.question}>{item.question}</Text>
          <View style={styles.reply} accessibilityLiveRegion="polite">
            {renderReply(item)}
          </View>
        </View>
      )}
    />
  );
}
