import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors, shapes, spacing, typography } from '../theme/colors';

interface SuggestionChipsProps {
  chips: string[];
  onSelectChip: (chip: string) => void;
  disabled?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = React.memo(
  ({ chips, onSelectChip, disabled = false }) => {
    const colorScheme = useColorScheme();
    const theme = colors[colorScheme];

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
              <Text style={[styles.chipText, { color: theme.text }]}>
                <Text style={{ color: theme.secondary }}>💡 </Text>
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

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginMobile, // 20px
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: shapes.full, // 9999px (full pill)
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 10,
    minHeight: spacing.touchMin, // 52px
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A3A34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chipText: {
    ...typography.labelMD,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
