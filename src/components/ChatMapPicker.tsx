import React, { useCallback, useMemo } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../hooks/useColorScheme';
import { colors } from '../theme/colors';
import { styles } from './ChatMapPicker.styles';

export interface ChatMapPickerProps {
  visible: boolean;
  initialLatitude?: number;
  initialLongitude?: number;
  onConfirm: (latitude: number, longitude: number) => void;
  onClose: () => void;
}

const DEFAULT_CENTER = { latitude: 40.4168, longitude: -3.7038 }; // Madrid, used only if no geocode hint exists

function buildMapHtml(latitude: number, longitude: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${latitude}, ${longitude}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    const marker = L.marker([${latitude}, ${longitude}], { draggable: true }).addTo(map);

    function post(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
    }

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      post(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      post(e.latlng.lat, e.latlng.lng);
    });

    post(${latitude}, ${longitude});
  </script>
</body>
</html>`;
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
  const [pin, setPin] = React.useState({
    latitude: initialLatitude ?? DEFAULT_CENTER.latitude,
    longitude: initialLongitude ?? DEFAULT_CENTER.longitude,
  });

  const html = useMemo(() => buildMapHtml(pin.latitude, pin.longitude), [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      if (typeof lat === 'number' && typeof lng === 'number') {
        setPin({ latitude: lat, longitude: lng });
      }
    } catch {
      // ignore malformed messages from the map page
    }
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar mapa"
            style={styles.closeButton}
          >
            <Ionicons name="close" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Fijar ubicación</Text>
          <View style={styles.closeButton} />
        </View>

        <WebView
          key={visible ? 'open' : 'closed'}
          source={{ html }}
          onMessage={handleMessage}
          style={styles.webview}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: '#163931' }]}
            onPress={() => onConfirm(pin.latitude, pin.longitude)}
            accessibilityRole="button"
            accessibilityLabel="Confirmar ubicación"
          >
            <Text style={styles.confirmButtonText}>Confirmar ubicación</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
