import React, { useMemo } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors } from '../theme/colors';
import { styles } from './PropertyPhotoGrid.styles';

export interface PropertyPhotoGridProps {
  images: string[];
  maxImages: number;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onAddPress: () => void;
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

type GridItem =
  | { type: 'photo'; uri: string; index: number }
  | { type: 'add' };

export const PropertyPhotoGrid: React.FC<PropertyPhotoGridProps> = ({
  images,
  maxImages,
  onRemove,
  onMove,
  onAddPress,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];

  const data: GridItem[] = useMemo(() => {
    const photoItems: GridItem[] = images.map((uri, index) => ({ type: 'photo', uri, index }));
    return images.length < maxImages ? [...photoItems, { type: 'add' }] : photoItems;
  }, [images, maxImages]);

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
                style={[styles.addCell, { borderColor: theme.outline }]}
                onPress={onAddPress}
                accessibilityRole="button"
                accessibilityLabel="Añadir más fotos"
              >
                <Ionicons name="add" size={24} color={theme.secondary} />
                <Text style={[styles.addCellText, { color: theme.secondary }]}>Añadir</Text>
              </TouchableOpacity>
            );
          }

          const { uri, index } = item;
          const isCover = index === 0;

          return (
            <View style={styles.cell}>
              <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />

              {isCover && (
                <View style={[styles.coverBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.coverBadgeText}>Portada</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemove(index)}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar foto ${index + 1}`}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.moveButtonRow}>
                <TouchableOpacity
                  style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                  onPress={() => onMove(index, 'up')}
                  disabled={index === 0}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Mover foto ${index + 1} hacia atrás`}
                  accessibilityState={{ disabled: index === 0 }}
                >
                  <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.moveButton, index === images.length - 1 && styles.moveButtonDisabled]}
                  onPress={() => onMove(index, 'down')}
                  disabled={index === images.length - 1}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Mover foto ${index + 1} hacia adelante`}
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
