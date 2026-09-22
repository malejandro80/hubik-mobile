import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  ListRenderItem,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GALLERY_FOREGROUND, GALLERY_THUMB_GAP, GALLERY_THUMB_SIZE } from '../constants/gallery';
import { useGalleryKeys } from '../hooks/useGalleryKeys';
import { useLabels } from '../hooks/useLabels';
import { ModalSafeArea } from './ModalSafeArea';
import { galleryStyles as styles } from './PhotoGallery.styles';

export interface PhotoGalleryProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

const THUMB_STEP = GALLERY_THUMB_SIZE + GALLERY_THUMB_GAP;

const clamp = (value: number, count: number) => Math.min(Math.max(value, 0), Math.max(count - 1, 0));

const PhotoGalleryContent: React.FC<Omit<PhotoGalleryProps, 'visible'>> = ({ images, initialIndex = 0, onClose }) => {
  const { gallery } = useLabels();
  const { width, height } = useWindowDimensions();
  const count = images.length;
  const isWeb = Platform.OS === 'web';
  const multiple = count > 1;
  const [firstIndex] = useState(() => clamp(initialIndex, count));
  const [index, setIndex] = useState(firstIndex);
  const [pagerHeight, setPagerHeight] = useState(0);
  const pagerRef = useRef<FlatList<string>>(null);
  const stripRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (multiple) stripRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }, [index, multiple]);

  const goTo = useCallback(
    (target: number) => {
      const next = clamp(target, count);
      setIndex(next);
      pagerRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [count]
  );

  const goPrevious = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useGalleryKeys({ enabled: multiple, onPrevious: goPrevious, onNext: goNext });

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(clamp(Math.round(event.nativeEvent.contentOffset.x / width), count));
  };

  const renderPage: ListRenderItem<string> = ({ item, index: position }) => (
    <View style={[styles.page, { width, height: pagerHeight }]}>
      <Image
        testID={`photo-gallery-image-${position}`}
        source={{ uri: item }}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel={gallery.photoA11y(position + 1, count)}
      />
    </View>
  );

  const renderThumb: ListRenderItem<string> = ({ item, index: position }) => {
    const selected = position === index;
    return (
      <TouchableOpacity
        style={[styles.thumb, selected && styles.thumbSelected]}
        onPress={() => goTo(position)}
        accessibilityRole="button"
        accessibilityLabel={gallery.thumbnailA11y(position + 1, count)}
        accessibilityState={{ selected }}
      >
        <Image source={{ uri: item }} style={styles.thumbImage} resizeMode="cover" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { width, height }]}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={gallery.closeA11y}
        >
          <Ionicons name="close" size={28} color={GALLERY_FOREGROUND} />
        </TouchableOpacity>
        {multiple ? <Text style={styles.counter}>{gallery.counter(index + 1, count)}</Text> : null}
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.pagerArea} onLayout={(event) => setPagerHeight(event.nativeEvent.layout.height)}>
        <FlatList
          ref={pagerRef}
          testID="photo-gallery-pager"
          data={images}
          keyExtractor={(uri, position) => `${position}-${uri}`}
          renderItem={renderPage}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={firstIndex}
          getItemLayout={(_data, position) => ({ length: width, offset: width * position, index: position })}
          onMomentumScrollEnd={handleMomentumEnd}
        />
        {isWeb && multiple && (
          <>
            <TouchableOpacity
              style={[styles.arrow, styles.arrowPrevious, index === 0 && styles.arrowDisabled]}
              onPress={goPrevious}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel={gallery.previousA11y}
              accessibilityState={{ disabled: index === 0 }}
            >
              <Ionicons name="chevron-back" size={28} color={GALLERY_FOREGROUND} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrow, styles.arrowNext, index === count - 1 && styles.arrowDisabled]}
              onPress={goNext}
              disabled={index === count - 1}
              accessibilityRole="button"
              accessibilityLabel={gallery.nextA11y}
              accessibilityState={{ disabled: index === count - 1 }}
            >
              <Ionicons name="chevron-forward" size={28} color={GALLERY_FOREGROUND} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {multiple && (
        <FlatList
          ref={stripRef}
          data={images}
          keyExtractor={(uri, position) => `thumb-${position}-${uri}`}
          renderItem={renderThumb}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stripList}
          contentContainerStyle={styles.strip}
          getItemLayout={(_data, position) => ({ length: THUMB_STEP, offset: THUMB_STEP * position, index: position })}
        />
      )}
    </SafeAreaView>
  );
};

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ visible, images, initialIndex, onClose }) => (
  <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
    <ModalSafeArea>
      {visible && <PhotoGalleryContent images={images} initialIndex={initialIndex} onClose={onClose} />}
    </ModalSafeArea>
  </Modal>
);
