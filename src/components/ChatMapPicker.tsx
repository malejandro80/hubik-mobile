import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors } from '../theme/colors';
import { buildMapHtml, DEFAULT_CENTER } from '../lib/mapPicker';
import { getChatMapPickerStyles } from './ChatMapPicker.styles';

export interface ChatMapPickerProps {
  visible: boolean;
  initialLatitude?: number;
  initialLongitude?: number;
  onConfirm: (latitude: number, longitude: number) => void;
  onClose: () => void;
}

export { DEFAULT_CENTER };

export async function resolveUserLocation(): Promise<{ latitude: number; longitude: number }> {
  try {
    if (typeof Location.requestForegroundPermissionsAsync === 'function') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const lastKnown =
          typeof Location.getLastKnownPositionAsync === 'function'
            ? await Location.getLastKnownPositionAsync()
            : null;

        const position =
          lastKnown ??
          (typeof Location.getCurrentPositionAsync === 'function'
            ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            : null);

        if (position) {
          return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        }
      }
    }
  } catch {
  }
  return DEFAULT_CENTER;
}

export const ChatMapPicker: React.FC<ChatMapPickerProps> = ({
  visible,
  initialLatitude,
  initialLongitude,
  onConfirm,
  onClose,
}) => {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme];
  const labels = useLabels();
  const { styles, iconColor, primaryColor } = useMemo(
    () => getChatMapPickerStyles(theme),
    [theme]
  );

  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (initialLatitude !== undefined && initialLongitude !== undefined) {
      return { latitude: initialLatitude, longitude: initialLongitude };
    }
    return null;
  });

  const [pin, setPin] = useState<{ latitude: number; longitude: number }>(() => {
    if (initialLatitude !== undefined && initialLongitude !== undefined) {
      return { latitude: initialLatitude, longitude: initialLongitude };
    }
    return DEFAULT_CENTER;
  });

  const [loadingLocation, setLoadingLocation] = useState(
    initialLatitude === undefined || initialLongitude === undefined
  );

  useEffect(() => {
    if (!visible) return;

    if (initialLatitude !== undefined && initialLongitude !== undefined) {
      const explicitCoords = { latitude: initialLatitude, longitude: initialLongitude };
      setPin(explicitCoords);
      setCenter(explicitCoords);
      setLoadingLocation(false);
      return;
    }

    let isCancelled = false;
    setLoadingLocation(true);

    resolveUserLocation().then((coords) => {
      if (!isCancelled) {
        setPin(coords);
        setCenter(coords);
        setLoadingLocation(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [visible, initialLatitude, initialLongitude]);

  const html = useMemo(() => {
    if (!center) return '';
    return buildMapHtml(center.latitude, center.longitude);
  }, [center]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      if (typeof lat === 'number' && typeof lng === 'number') {
        setPin({ latitude: lat, longitude: lng });
      }
    } catch {
    }
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={labels.mapPicker.closeA11y}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={26} color={iconColor} />
          </TouchableOpacity>
          <Text style={styles.title}>{labels.mapPicker.title}</Text>
          <View style={styles.closeButton} />
        </View>

        {loadingLocation || !center ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} testID="map-location-loader" />
            <Text style={styles.loadingText}>{labels.mapPicker.loadingLocation}</Text>
          </View>
        ) : (
          <WebView
            key={`${center.latitude}-${center.longitude}`}
            source={{ html }}
            onMessage={handleMessage}
            style={styles.webview}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => onConfirm(pin.latitude, pin.longitude)}
            accessibilityRole="button"
            accessibilityLabel={labels.mapPicker.confirmA11y}
          >
            <Text style={styles.confirmButtonText}>{labels.mapPicker.confirm}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
