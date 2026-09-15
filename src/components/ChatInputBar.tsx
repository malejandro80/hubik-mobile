import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors, typography } from '../theme/colors';

export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text?: string) => void;
  onMicPress?: () => void;
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
  placeholder = 'Escriba su consulta aquí...',
  loading = false,
  accessibilityLabel = 'Campo de consulta',
  containerStyle,
  hasTopBorder = true,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const [isFocused, setIsFocused] = useState(false);

  const isSendActive = Boolean(value.trim());

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
        hasTopBorder && {
          borderTopWidth: 1,
          borderTopColor: theme.outlineVariant,
        },
        { backgroundColor: theme.background },
        containerStyle,
      ]}
    >
      {/* Input Capsule / Pill */}
      <View
        style={[
          styles.inputCapsule,
          {
            backgroundColor: theme.surfaceContainerLow,
            borderColor: isFocused ? theme.secondary : theme.outlineVariant,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={() => {
            if (isSendActive) onSend(value.trim());
          }}
          returnKeyType="send"
          editable={!loading}
          accessibilityLabel={accessibilityLabel}
        />
      </View>

      {/* Action Button (Mic / Send) */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: '#163931' },
        ]}
        onPress={handleActionPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={
          isSendActive ? 'Enviar consulta' : 'Hablar por micrófono'
        }
        accessibilityState={{
          busy: loading,
        }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : isSendActive ? (
          <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
        ) : (
          <Ionicons name="mic" size={26} color="#FFFFFF" />
        )}
        <Text style={styles.srOnly}>Enviar</Text>
      </TouchableOpacity>
    </View>
  );
});

ChatInputBar.displayName = 'ChatInputBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    ...typography.bodyLG,
    fontSize: 16,
    height: '100%',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#02241F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
