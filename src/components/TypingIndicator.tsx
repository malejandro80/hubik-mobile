import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import {
  TYPING_DOT_COUNT,
  TYPING_DOT_FADE_MS,
  TYPING_DOT_MIN_OPACITY,
  TYPING_DOT_STEP_MS,
} from '../constants/typewriter';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors } from '../theme';
import { getTypingIndicatorStyles } from './TypingIndicator.styles';

export const TypingIndicator: React.FC = () => {
  const { chat } = useLabels();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getTypingIndicatorStyles(colors[colorScheme]), [colorScheme]);
  const reduceMotion = useReduceMotion();
  const [opacities] = useState(() =>
    Array.from({ length: TYPING_DOT_COUNT }, () => new Animated.Value(TYPING_DOT_MIN_OPACITY))
  );

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.stagger(
        TYPING_DOT_STEP_MS,
        opacities.map((opacity) =>
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: TYPING_DOT_FADE_MS, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: TYPING_DOT_MIN_OPACITY, duration: TYPING_DOT_FADE_MS, useNativeDriver: true }),
          ])
        )
      )
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, opacities]);

  return (
    <View style={styles.container} accessible accessibilityLabel={chat.typing} accessibilityLiveRegion="polite">
      <View style={styles.dots}>
        {opacities.map((opacity, index) => (
          <Animated.View key={index} style={[styles.dot, { opacity }]} />
        ))}
      </View>
      <Text style={styles.label}>{chat.typing}</Text>
    </View>
  );
};
