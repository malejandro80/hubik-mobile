import React, { useMemo } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { ClientSearchStatus } from '../hooks/useClientSearch';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme';
import { ClientCandidate } from '../types/auth';
import { getClientSearchResultsStyles } from './ClientSearchResults.styles';

export interface ClientSearchResultsProps {
  status: ClientSearchStatus;
  results: ClientCandidate[];
  onPick: (candidate: ClientCandidate) => void;
}

const keyExtractor = (candidate: ClientCandidate) => candidate.userId;

export const ClientSearchResults: React.FC<ClientSearchResultsProps> = ({ status, results, onPick }) => {
  const { auth } = useLabels();
  const copy = auth.agents.search;
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getClientSearchResultsStyles(colors[colorScheme]), [colorScheme]);

  if (status === 'idle') return null;

  const message =
    status === 'loading'
      ? copy.searching
      : status === 'rate_limited'
        ? copy.rateLimited
        : status === 'error'
          ? copy.error
          : results.length === 0
            ? copy.noResults
            : null;

  if (message) {
    return (
      <View style={styles.container}>
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const name = item.displayName?.trim() || copy.unnamedClient;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onPick(item)}
              accessibilityRole="button"
              accessibilityLabel={copy.resultA11y(name, item.maskedEmail)}
            >
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.email}>{item.maskedEmail}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};
