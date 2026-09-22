import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme/colors';
import { getInstallBarStyles } from './InstallBar.styles';

export interface InstallBarProps {
  onPress: () => void;
}

export const InstallBar: React.FC<InstallBarProps> = ({ onPress }) => {
  const { sharedProperty } = useLabels();
  const copy = sharedProperty.bar;
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getInstallBarStyles(colors[colorScheme]), [colorScheme]);

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>{copy.text}</Text>
      <TouchableOpacity style={styles.button} onPress={onPress} accessibilityRole="button" accessibilityLabel={copy.ctaA11y}>
        <Text style={styles.buttonText}>{copy.cta}</Text>
      </TouchableOpacity>
    </View>
  );
};
