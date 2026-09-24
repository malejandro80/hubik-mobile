import React, { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useClientSearch } from '../hooks/useClientSearch';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { searchLandlordCandidates } from '../services/authApi';
import { colors } from '../theme';
import { ClientCandidate } from '../types/auth';
import { ClientSearchResults } from './ClientSearchResults';
import { getLandlordPickerStyles } from './LandlordPicker.styles';

export interface LandlordPickerProps {
  value: ClientCandidate | null;
  onChange: (landlord: ClientCandidate | null) => void;
}

export const LandlordPicker: React.FC<LandlordPickerProps> = ({ value, onChange }) => {
  const { landlord } = useLabels();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(() => getLandlordPickerStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const search = useClientSearch(query, searchLandlordCandidates);

  const pick = (candidate: ClientCandidate) => {
    setQuery('');
    onChange(candidate);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{landlord.title}</Text>
      {value ? (
        <View style={styles.selected}>
          <Text style={styles.selectedText}>
            {landlord.selected(value.displayName ?? landlord.unnamed, value.maskedEmail)}
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onChange(null)}
            accessibilityRole="button"
            accessibilityLabel={landlord.removeA11y}
          >
            <Text style={styles.removeText}>{landlord.remove}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={landlord.placeholder}
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={landlord.searchA11y}
          />
          <ClientSearchResults status={search.status} results={search.results} onPick={pick} />
        </>
      )}
    </View>
  );
};
