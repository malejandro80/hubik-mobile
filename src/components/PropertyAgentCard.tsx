import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme';
import { getPropertyAgentCardStyles } from './PropertyAgentCard.styles';

export interface PropertyAgentCardProps {
  agencyName?: string | null;
  agentName?: string | null;
}

export const PropertyAgentCard: React.FC<PropertyAgentCardProps> = ({
  agencyName,
  agentName,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const { auth, propertyDetail } = useLabels();
  const styles = useMemo(() => getPropertyAgentCardStyles(theme), [theme]);

  if (!agencyName && !agentName) {
    return null;
  }

  const displayName = agencyName || agentName || '';
  const initial = displayName.charAt(0).toUpperCase();
  const attributionText = labelsAttribution(agencyName, agentName, auth);

  return (
    <View
      testID="listing-attribution"
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={propertyDetail.agentCard.cardA11y(
        agencyName ?? '',
        agentName ?? undefined
      )}
    >
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarInitial}>{initial}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.attributionPrompt}>
          {propertyDetail.agentCard.contactPrompt}
        </Text>
        <Text style={styles.attributionName}>{attributionText}</Text>
      </View>
    </View>
  );
};

function labelsAttribution(
  agencyName: string | null | undefined,
  agentName: string | null | undefined,
  auth: { listedBy: (agency: string, agent?: string) => string }
): string {
  if (agencyName) {
    return auth.listedBy(agencyName, agentName ?? undefined);
  }
  return agentName ?? '';
}
