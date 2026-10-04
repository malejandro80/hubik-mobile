import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { useNewAskTurn } from '../hooks/useNewAskTurn';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useTypewriter } from '../hooks/useTypewriter';
import { resolveTurnStageKey } from '../lib/askTurnKey';
import { MessageParagraph, parseMessageParagraphs } from '../lib/messageParser';
import { colors } from '../theme';
import { AskTurn } from '../types/propertyAsk';
import { getPropertyAskThreadStyles } from './PropertyAskThread.styles';

export interface PropertyAskThreadProps {
  turns: AskTurn[];
  pending: boolean;
  onChoose: (option: string) => void;
  animate?: boolean;
  writingStageKey?: string | null;
  onFinishWriting?: (stageKey: string) => void;
}

interface PropertyAskTurnItemProps {
  turn: AskTurn;
  pending: boolean;
  animate: boolean;
  writingStageKey: string | null;
  finishWriting: (stageKey: string) => void;
  onWriteProgress: () => void;
  onChoose: (option: string) => void;
  styles: ReturnType<typeof getPropertyAskThreadStyles>;
  labels: ReturnType<typeof useLabels>['propertyAsk'];
  themePrimary: string;
}

const renderParagraphs = (
  paragraphs: MessageParagraph[],
  styles: ReturnType<typeof getPropertyAskThreadStyles>
) =>
  paragraphs.map((paragraph, pIndex) => (
    <Text
      key={pIndex}
      style={[
        styles.replyText,
        pIndex < paragraphs.length - 1 ? styles.paragraphSpacing : null,
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

const PropertyAskTurnItem: React.FC<PropertyAskTurnItemProps> = React.memo(
  ({
    turn,
    pending,
    animate,
    writingStageKey,
    finishWriting,
    onWriteProgress,
    onChoose,
    styles,
    labels,
    themePrimary,
  }) => {
    const fullText = useMemo(() => {
      if (turn.status === 'done') return turn.answer ?? '';
      if (turn.status === 'clarify' && turn.clarify) return turn.clarify.question;
      return '';
    }, [turn.status, turn.answer, turn.clarify]);

    const parsedParagraphs = useMemo(
      () => parseMessageParagraphs(fullText),
      [fullText]
    );

    const stageKey = useMemo(() => resolveTurnStageKey(turn), [turn]);
    const shouldAnimate = Boolean(
      animate && stageKey && writingStageKey === stageKey
    );
    const reduceMotion = useReduceMotion();
    const writing = shouldAnimate && !reduceMotion;

    const handleDone = useCallback(() => {
      if (stageKey) finishWriting(stageKey);
    }, [finishWriting, stageKey]);

    const { visible, done } = useTypewriter(
      parsedParagraphs,
      writing,
      handleDone,
      onWriteProgress
    );

    const renderReplyContent = () => {
      if (turn.status === 'pending') {
        return (
          <View style={styles.thinking}>
            <ActivityIndicator color={themePrimary} />
            <Text style={styles.mutedText}>{labels.thinking}</Text>
          </View>
        );
      }

      if (turn.status === 'error') {
        return <Text style={styles.errorText}>{labels.error}</Text>;
      }

      if (turn.status === 'clarify' && turn.clarify) {
        return (
          <>
            {renderParagraphs(visible, styles)}
            {done && (
              <>
                <View style={styles.options}>
                  {turn.clarify.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.option}
                      onPress={() => onChoose(option)}
                      disabled={pending}
                      accessibilityRole="button"
                      accessibilityLabel={labels.optionA11y(option)}
                      accessibilityState={{ disabled: pending }}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.mutedText}>{labels.otherHint}</Text>
              </>
            )}
          </>
        );
      }

      return renderParagraphs(visible, styles);
    };

    return (
      <View style={styles.turn}>
        <Text style={styles.question}>{turn.question}</Text>
        <View
          style={styles.reply}
          accessibilityLiveRegion="polite"
          accessible={writing || undefined}
          accessibilityLabel={writing ? fullText : undefined}
        >
          {renderReplyContent()}
        </View>
      </View>
    );
  }
);

PropertyAskTurnItem.displayName = 'PropertyAskTurnItem';

export function PropertyAskThread({
  turns,
  pending,
  onChoose,
  animate = true,
  writingStageKey,
  onFinishWriting,
}: PropertyAskThreadProps) {
  const { propertyAsk } = useLabels();
  const theme = colors[useColorScheme()];
  const styles = useMemo(() => getPropertyAskThreadStyles(theme), [theme]);
  const flatListRef = useRef<FlatList<AskTurn>>(null);
  const internal = useNewAskTurn(turns);

  const activeWritingStageKey =
    writingStageKey !== undefined ? writingStageKey : internal.writingStageKey;
  const activeFinishWriting = onFinishWriting ?? internal.finishWriting;

  const scrollToEndNow = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  useEffect(() => {
    if (turns.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [turns.length]);

  if (turns.length === 0) return null;

  return (
    <FlatList
      ref={flatListRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      data={turns}
      keyExtractor={(turn) => turn.id}
      accessibilityLabel={propertyAsk.threadA11y}
      renderItem={({ item }) => (
        <PropertyAskTurnItem
          turn={item}
          pending={pending}
          animate={animate}
          writingStageKey={activeWritingStageKey}
          finishWriting={activeFinishWriting}
          onWriteProgress={scrollToEndNow}
          onChoose={onChoose}
          styles={styles}
          labels={propertyAsk}
          themePrimary={theme.primary}
        />
      )}
    />
  );
}
