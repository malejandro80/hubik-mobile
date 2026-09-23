import React, { useMemo } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors } from '../theme';
import { useColorScheme } from '../hooks/useColorScheme';
import { getButtonStyles, ButtonVariant } from './Button.styles';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
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

  const { styles, textColor } = useMemo(
    () => getButtonStyles(theme, variant, disabled),
    [theme, variant, disabled]
  );

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
        <Text style={[styles.text, textStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};
