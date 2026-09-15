import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, shapes, spacing, typography } from '../theme/colors';
import { useColorScheme } from '../hooks/useColorScheme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
  testID = 'custom-button',
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary
    ? disabled
      ? theme.disabled
      : theme.primary
    : theme.surfaceContainer;

  const textColor = isPrimary
    ? theme.primaryText
    : disabled
    ? theme.disabled
    : theme.primary;

  const borderColor = isPrimary ? undefined : theme.primary;
  const borderWidth = isPrimary ? 0 : 2;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor,
          borderColor,
          borderWidth,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-loading-indicator"
          color={textColor}
          size="small"
        />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: spacing.touchDefault, // 56px
    minWidth: 120,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: shapes.lg, // 16px
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  text: {
    ...typography.labelLG,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
