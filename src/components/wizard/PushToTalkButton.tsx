import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { shapes } from '../../theme/colors';

interface PushToTalkButtonProps {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  label?: string;
}

export const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  isRecording,
  onPressIn,
  onPressOut,
  label = 'Mantenga presionado para dictar',
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      if (process.env.NODE_ENV === 'test') {
        pulseAnim.setValue(1.25);
        return;
      }
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      animation?.stop();
    };
  }, [isRecording, pulseAnim]);

  const handlePressIn = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Haptics optional fallback
    }
    onPressIn();
  };

  const handlePressOut = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics optional fallback
    }
    onPressOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        {isRecording && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        )}

        <TouchableOpacity
          style={[
            styles.button,
            isRecording ? styles.buttonRecording : styles.buttonIdle,
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Grabando audio de la vivienda' : 'Dictar detalles por voz'}
          accessibilityState={{ busy: isRecording }}
        >
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={34}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.captionText}>
        {isRecording ? 'Soltar al terminar de hablar' : label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 18,
  },
  buttonWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: shapes.full,
    backgroundColor: 'rgba(186, 26, 26, 0.25)',
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#02241F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  buttonIdle: {
    backgroundColor: '#1A3A34', // Blueprint deep forest
  },
  buttonRecording: {
    backgroundColor: '#BA1A1A', // Blueprint alert/active red
  },
  captionText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#404845',
  },
});
