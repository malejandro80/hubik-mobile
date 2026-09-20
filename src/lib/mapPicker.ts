export const MADRID_FALLBACK_COORDINATES = { latitude: 40.4168, longitude: -3.7038 };
export const DEFAULT_CENTER = MADRID_FALLBACK_COORDINATES;

export function buildMapHtml(latitude: number, longitude: number): string {
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
