import React, { useMemo } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme/colors';
import { getSuggestionChipsStyles } from './SuggestionChips.styles';

interface SuggestionChipsProps {
  chips: string[];
  onSelectChip: (chip: string) => void;
  disabled?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = React.memo(
  ({ chips, onSelectChip, disabled = false }) => {
    const colorScheme = useColorScheme();
    const theme = colors[colorScheme];
    const labels = useLabels();
    const styles = useMemo(() => getSuggestionChipsStyles(theme), [theme]);

    if (!chips || chips.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {chips.map((chip, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.8}
              disabled={disabled}
              style={[
                styles.chip,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => onSelectChip(chip)}
              accessibilityRole="button"
              accessibilityLabel={labels.suggestionChips.searchForA11y(chip)}
              accessibilityState={{ disabled }}
            >
              <Text style={styles.chipText}>
                <Text style={styles.chipIconText}>💡 </Text>
                {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
);

SuggestionChips.displayName = 'SuggestionChips';
