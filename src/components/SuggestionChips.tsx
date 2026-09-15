import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors } from '../theme/colors';

interface SuggestionChipsProps {
  chips: string[];
  onSelectChip: (chip: string) => void;
  disabled?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = React.memo(
  ({ chips, onSelectChip, disabled = false }) => {
    const colorScheme = useColorScheme();
    const theme = colors[colorScheme];

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
              activeOpacity={0.7}
              disabled={disabled}
              style={[
                styles.chip,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: disabled ? 0.6 : 1,
                },
              ]}
              onPress={() => onSelectChip(chip)}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${chip}`}
              accessibilityState={{ disabled }}
            >
              <Text style={[styles.chipText, { color: theme.primary }]}>
                💡 {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
);

SuggestionChips.displayName = 'SuggestionChips';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
