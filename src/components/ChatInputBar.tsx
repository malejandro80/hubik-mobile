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
import { MIN_PHOTOS_TO_ORDER } from '../constants/photoOrder';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors, hitSlop } from '../theme/colors';
import { getChatInputBarStyles } from './ChatInputBar.styles';

type ActionOptionKey = 'recording' | 'send' | 'mic';

interface ActionOption {
  accessibilityLabel: string;
  icon: React.ReactNode;
}

export interface ChatInputAttachments {
  onAddPhotos: () => void;
  onPickLocation: () => void;
  onOrderPhotos?: () => void;
  photoCount: number;
  hasPin: boolean;
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
  attachments?: ChatInputAttachments;
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
  attachments,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const [isFocused, setIsFocused] = useState(false);

  const resolvedPlaceholder = placeholder ?? labels.chat.inputPlaceholder;
  const resolvedAccessibilityLabel = accessibilityLabel ?? labels.chat.accessibilityInput;

  const { styles, placeholderTextColor, iconColor, attachmentIconColor } = useMemo(
    () => getChatInputBarStyles(theme),
    [theme]
  );

  const isSendActive = Boolean(value.trim());
  const attachmentsDisabled = loading || isRecording;
  const canOrderPhotos = Boolean(attachments?.onOrderPhotos) && (attachments?.photoCount ?? 0) >= MIN_PHOTOS_TO_ORDER;

  const getActionType = (): ActionOptionKey => {
    if (isRecording) return 'recording';
    if (isSendActive || !onMicPress) return 'send';
    return 'mic';
  };

  const actionType = getActionType();
  const sendDisabled = actionType === 'send' && !isSendActive;

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
        styles.wrapper,
        hasTopBorder && styles.containerTopBorder,
        containerStyle,
      ]}
    >
      {attachments && (
        <View style={styles.attachmentsRow}>
          <TouchableOpacity
            style={[styles.attachmentButton, attachments.photoCount > 0 && styles.attachmentButtonActive]}
            onPress={attachments.onAddPhotos}
            disabled={attachmentsDisabled}
            accessibilityRole="button"
            accessibilityLabel={labels.composer.attachPhotosA11y(attachments.photoCount)}
            accessibilityState={{ disabled: attachmentsDisabled }}
            hitSlop={hitSlop.compact}
          >
            <Ionicons name="images-outline" size={20} color={attachmentIconColor} />
            <Text style={styles.attachmentText}>{labels.composer.attachPhotos}</Text>
            {attachments.photoCount > 0 && (
              <View style={styles.attachmentBadge}>
                <Text style={styles.attachmentBadgeText}>{attachments.photoCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {canOrderPhotos && (
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={attachments.onOrderPhotos}
              disabled={attachmentsDisabled}
              accessibilityRole="button"
              accessibilityLabel={labels.composer.orderPhotosA11y}
              accessibilityState={{ disabled: attachmentsDisabled }}
              hitSlop={hitSlop.compact}
            >
              <Ionicons name="swap-vertical" size={20} color={attachmentIconColor} />
              <Text style={styles.attachmentText}>{labels.composer.orderPhotos}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.attachmentButton, attachments.hasPin && styles.attachmentButtonActive]}
            onPress={attachments.onPickLocation}
            disabled={attachmentsDisabled}
            accessibilityRole="button"
            accessibilityLabel={labels.composer.pickLocationA11y(attachments.hasPin)}
            accessibilityState={{ disabled: attachmentsDisabled }}
            hitSlop={hitSlop.compact}
          >
            <Ionicons name={attachments.hasPin ? 'location' : 'location-outline'} size={20} color={attachmentIconColor} />
            <Text style={styles.attachmentText}>{labels.composer.pickLocation}</Text>
            {attachments.hasPin && <Ionicons name="checkmark-circle" size={16} color={attachmentIconColor} />}
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.container}>
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
            sendDisabled && styles.actionButtonDisabled,
          ]}
          onPress={handleActionPress}
          disabled={loading || sendDisabled}
          accessibilityRole="button"
          accessibilityLabel={selectedAction.accessibilityLabel}
          accessibilityState={{
            busy: loading,
            selected: isRecording,
            disabled: sendDisabled,
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
    </View>
  );
});

ChatInputBar.displayName = 'ChatInputBar';
