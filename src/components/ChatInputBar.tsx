import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors, hitSlop } from '../theme/colors';
import { getChatInputBarStyles } from './ChatInputBar.styles';

type ActionOptionKey = 'recording' | 'send' | 'mic';

interface ActionOption {
  accessibilityLabel: string;
  icon: React.ReactNode;
}

export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text?: string) => void;
  onMicPress?: () => void;
  isRecording?: boolean;
  placeholder?: string;
  loading?: boolean;
  accessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  hasTopBorder?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = React.memo(({
  value,
  onChangeText,
  onSend,
  onMicPress,
  isRecording = false,
  placeholder,
  loading = false,
  accessibilityLabel,
  containerStyle,
  hasTopBorder = false,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const [isFocused, setIsFocused] = useState(false);

  const resolvedPlaceholder = placeholder ?? labels.chat.inputPlaceholder;
  const resolvedAccessibilityLabel = accessibilityLabel ?? labels.chat.accessibilityInput;

  const { styles, placeholderTextColor, iconColor } = useMemo(
    () => getChatInputBarStyles(theme),
    [theme]
  );

  const isSendActive = Boolean(value.trim());

  const getActionType = (): ActionOptionKey => {
    if (isRecording) return 'recording';
    if (isSendActive) return 'send';
    return 'mic';
  };

  const actionType = getActionType();

  const actionOptions: Record<ActionOptionKey, ActionOption> = useMemo(
    () => ({
      recording: {
        accessibilityLabel: labels.chat.stopRecordingA11y,
        icon: <Ionicons name="stop-circle" size={26} color={iconColor} />,
      },
      send: {
        accessibilityLabel: labels.chat.sendQueryA11y,
        icon: <Ionicons name="arrow-up" size={24} color={iconColor} />,
      },
      mic: {
        accessibilityLabel: labels.chat.micA11y,
        icon: <Ionicons name="mic" size={26} color={iconColor} />,
      },
    }),
    [iconColor, labels]
  );

  const selectedAction = actionOptions[actionType];

  const handleActionPress = () => {
    if (isSendActive) {
      onSend(value.trim());
    } else if (onMicPress) {
      onMicPress();
    }
  };

  return (
    <View
      style={[
        styles.container,
        hasTopBorder && styles.containerTopBorder,
        containerStyle,
      ]}
    >
      <View
        style={[
          styles.inputCapsule,
          isFocused && styles.inputCapsuleFocused,
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={placeholderTextColor}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={() => {
            if (isSendActive) onSend(value.trim());
          }}
          returnKeyType="send"
          editable={!loading && !isRecording}
          accessibilityLabel={resolvedAccessibilityLabel}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          isRecording && styles.actionButtonRecording,
        ]}
        onPress={handleActionPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={selectedAction.accessibilityLabel}
        accessibilityState={{
          busy: loading,
          selected: isRecording,
        }}
        hitSlop={hitSlop.compact}
      >
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          selectedAction.icon
        )}
        <Text style={styles.srOnly}>{labels.chat.sendSrOnly}</Text>
      </TouchableOpacity>
    </View>
  );
});

ChatInputBar.displayName = 'ChatInputBar';
