import React, { useMemo } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors, hitSlop } from '../theme/colors';
import { buildPhotoGridData, GridItem } from '../lib/photoGrid';
import { getPropertyPhotoGridStyles } from './PropertyPhotoGrid.styles';

export type { GridItem };

export interface PropertyPhotoGridProps {
  images: string[];
  maxImages: number;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onAddPress: () => void;
}

export const PropertyPhotoGrid: React.FC<PropertyPhotoGridProps> = ({
  images,
  maxImages,
  onRemove,
  onMove,
  onAddPress,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const { styles, addIconColor } = useMemo(
    () => getPropertyPhotoGridStyles(theme),
    [theme]
  );

  const data = useMemo(
    () => buildPhotoGridData(images, maxImages),
    [images, maxImages]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => (item.type === 'photo' ? item.uri : 'add-tile')}
        numColumns={3}
        columnWrapperStyle={styles.row}
        scrollEnabled={false}
        renderItem={({ item }) => {
          if (item.type === 'add') {
            return (
              <TouchableOpacity
                style={styles.addCell}
                onPress={onAddPress}
                accessibilityRole="button"
                accessibilityLabel={labels.photoGrid.addA11y}
              >
                <Ionicons name="add" size={24} color={addIconColor} />
                <Text style={styles.addCellText}>{labels.photoGrid.add}</Text>
              </TouchableOpacity>
            );
          }

          const { uri, index } = item;
          const isCover = index === 0;

          return (
            <View style={styles.cell}>
              <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />

              {isCover && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>{labels.photoGrid.cover}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemove(index)}
                hitSlop={hitSlop.spacious}
                accessibilityRole="button"
                accessibilityLabel={labels.photoGrid.removeA11y(index + 1)}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.moveButtonRow}>
                <TouchableOpacity
                  style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                  onPress={() => onMove(index, 'up')}
                  disabled={index === 0}
                  hitSlop={hitSlop.spacious}
                  accessibilityRole="button"
                  accessibilityLabel={labels.photoGrid.moveBackA11y(index + 1)}
                  accessibilityState={{ disabled: index === 0 }}
                >
                  <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.moveButton, index === images.length - 1 && styles.moveButtonDisabled]}
                  onPress={() => onMove(index, 'down')}
                  disabled={index === images.length - 1}
                  hitSlop={hitSlop.spacious}
                  accessibilityRole="button"
                  accessibilityLabel={labels.photoGrid.moveForwardA11y(index + 1)}
                  accessibilityState={{ disabled: index === images.length - 1 }}
                >
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};
