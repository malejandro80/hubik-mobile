import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ClarificationQuestion } from '../../types/voiceWizard';
import { useColorScheme } from '../../hooks/useColorScheme';
import { colors, shapes, spacing, typography } from '../../theme/colors';

interface BinaryClarificationCardProps {
  question: ClarificationQuestion;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (questionId: string, answer: boolean) => void;
}

export const BinaryClarificationCard: React.FC<BinaryClarificationCardProps> = ({
  question,
  currentIndex,
  totalQuestions,
  onAnswer,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.secondary,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Pregunta ${currentIndex + 1} de ${totalQuestions}: ${question.question}`}
    >
      {/* Header Tag */}
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: '#E3EFEA' }]}>
          <Ionicons name="help-circle" size={16} color={theme.primary} />
          <Text style={[styles.badgeText, { color: theme.primary }]}>
            Aclaración {currentIndex + 1} de {totalQuestions}
          </Text>
        </View>
      </View>

      {/* Main Question */}
      <Text style={[styles.questionText, { color: theme.text }]}>
        {question.question}
      </Text>

      {/* Explanation / Context */}
      {question.explanation && (
        <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
          {question.explanation}
        </Text>
      )}

      {/* Giant Binary Buttons [SÍ] / [NO] */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.binaryButton, styles.noButton, { backgroundColor: theme.surfaceContainer, borderColor: theme.outline }]}
          onPress={() => onAnswer(question.id, false)}
          accessibilityRole="button"
          accessibilityLabel="No"
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={24} color={theme.text} />
          <Text style={[styles.binaryButtonText, { color: theme.text }]}>NO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.binaryButton, styles.yesButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}
          onPress={() => onAnswer(question.id, true)}
          accessibilityRole="button"
          accessibilityLabel="Sí"
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
          <Text style={[styles.binaryButtonText, { color: '#FFFFFF' }]}>SÍ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: shapes.xl,
    borderWidth: 2,
    marginBottom: 20,
    shadowColor: '#02241F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: shapes.full,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  questionText: {
    ...typography.headlineMD,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 8,
  },
  explanationText: {
    ...typography.bodyLG,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  binaryButton: {
    flex: 1,
    height: spacing.touchDefault, // 56dp (meets ≥ 52dp senior target)
    borderRadius: shapes.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  noButton: {},
  yesButton: {},
  binaryButtonText: {
    ...typography.labelLG,
    fontSize: 18,
    fontWeight: '700',
  },
});
