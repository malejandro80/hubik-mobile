import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReorderableList, { ReorderableListReorderEvent, useReorderableDrag } from 'react-native-reorderable-list';
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EMPTY_SAFE_AREA_METRICS } from '../constants/photoOrder';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { moveItem } from '../lib/photoOrder';
import { colors } from '../theme/colors';
import { getPhotoOrderModalStyles, gestureRootStyle } from './PhotoOrderModal.styles';

export interface PhotoOrderModalProps {
  visible: boolean;
  photos: string[];
  onConfirm: (photos: string[]) => void;
  onClose: () => void;
}

interface PhotoRowProps {
  uri: string;
  index: number;
  count: number;
  onMove: (index: number, direction: -1 | 1) => void;
}

const keyExtractor = (uri: string) => uri;

const PhotoRow: React.FC<PhotoRowProps> = ({ uri, index, count, onMove }) => {
  const { photoOrder } = useLabels();
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const styles = useMemo(() => getPhotoOrderModalStyles(theme), [theme]);
  const drag = useReorderableDrag();
  const isFirst = index === 0;
  const isLast = index === count - 1;

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.handle}
        onLongPress={drag}
        delayLongPress={150}
        accessibilityRole="button"
        accessibilityLabel={photoOrder.dragA11y(index + 1)}
      >
        <Ionicons name="reorder-three" size={28} color={theme.textSecondary} />
      </Pressable>
      <Image testID={`photo-order-thumb-${index}`} source={{ uri }} style={styles.thumb} resizeMode="cover" />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, isFirst && styles.coverLabel]}>
          {isFirst ? photoOrder.cover : photoOrder.position(index + 1)}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.moveButton, isFirst && styles.moveButtonDisabled]}
        onPress={() => onMove(index, -1)}
        disabled={isFirst}
        accessibilityRole="button"
        accessibilityLabel={photoOrder.moveUpA11y(index + 1)}
        accessibilityState={{ disabled: isFirst }}
      >
        <Ionicons name="chevron-up" size={24} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.moveButton, isLast && styles.moveButtonDisabled]}
        onPress={() => onMove(index, 1)}
        disabled={isLast}
        accessibilityRole="button"
        accessibilityLabel={photoOrder.moveDownA11y(index + 1)}
        accessibilityState={{ disabled: isLast }}
      >
        <Ionicons name="chevron-down" size={24} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
};

const PhotoOrderContent: React.FC<Omit<PhotoOrderModalProps, 'visible'>> = ({ photos, onConfirm, onClose }) => {
  const { photoOrder } = useLabels();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getPhotoOrderModalStyles(colors[colorScheme]), [colorScheme]);
  const [working, setWorking] = useState<string[]>(photos);

  const handleMove = (index: number, direction: -1 | 1) => {
    setWorking((current) => moveItem(current, index, index + direction));
  };

  const handleReorder = ({ from, to }: ReorderableListReorderEvent) => {
    setWorking((current) => moveItem(current, from, to));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={photoOrder.cancel}
        >
          <Text style={styles.cancelText}>{photoOrder.cancel}</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          {photoOrder.title}
        </Text>
        <TouchableOpacity
          style={[styles.headerButton, styles.doneButton]}
          onPress={() => onConfirm(working)}
          accessibilityRole="button"
          accessibilityLabel={photoOrder.done}
        >
          <Text style={styles.doneText}>{photoOrder.done}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>{photoOrder.hint}</Text>
      <ReorderableList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={working}
        keyExtractor={keyExtractor}
        onReorder={handleReorder}
        renderItem={({ item, index }) => <PhotoRow uri={item} index={index} count={working.length} onMove={handleMove} />}
      />
    </SafeAreaView>
  );
};

export const PhotoOrderModal: React.FC<PhotoOrderModalProps> = ({ visible, photos, onConfirm, onClose }) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <GestureHandlerRootView style={gestureRootStyle}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics ?? EMPTY_SAFE_AREA_METRICS}>
        {visible && <PhotoOrderContent photos={photos} onConfirm={onConfirm} onClose={onClose} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  </Modal>
);
