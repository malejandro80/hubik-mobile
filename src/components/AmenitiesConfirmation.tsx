import React, { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { normalizeAmenities } from '../lib/amenities';
import { colors } from '../theme';
import { getAmenitiesConfirmationStyles } from './AmenitiesConfirmation.styles';

export interface AmenitiesConfirmationProps {
  amenities: string[];
  onChange: (amenities: string[]) => void;
}

export const AmenitiesConfirmation: React.FC<AmenitiesConfirmationProps> = ({
  amenities,
  onChange,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const { styles, placeholderColor, iconColor, iconColorOnPrimary } = useMemo(
    () => getAmenitiesConfirmationStyles(theme),
    [theme]
  );
  const [draftText, setDraftText] = useState('');

  const handleRemove = (amenity: string) => {
    onChange(amenities.filter((a) => a !== amenity));
  };

  const handleAdd = () => {
    const [normalized] = normalizeAmenities([draftText]);
    if (!normalized || amenities.includes(normalized)) return;
    onChange([...amenities, normalized]);
    setDraftText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{labels.amenitiesConfirmation.title}</Text>

      {amenities.length === 0 ? (
        <Text style={styles.emptyText}>{labels.amenitiesConfirmation.empty}</Text>
      ) : (
        <View style={styles.chipsRow}>
          {amenities.map((amenity) => (
            <TouchableOpacity
              key={amenity}
              style={styles.chip}
              onPress={() => handleRemove(amenity)}
              accessibilityRole="button"
              accessibilityLabel={labels.amenitiesConfirmation.removeA11y(amenity)}
            >
              <Text style={styles.chipText}>{amenity}</Text>
              <Ionicons name="close" size={14} color={iconColor} style={styles.chipRemoveIcon} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder={labels.amenitiesConfirmation.addPlaceholder}
          placeholderTextColor={placeholderColor}
          value={draftText}
          onChangeText={setDraftText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={labels.amenitiesConfirmation.addA11y}
        >
          <Ionicons name="add" size={20} color={iconColorOnPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

AmenitiesConfirmation.displayName = 'AmenitiesConfirmation';
