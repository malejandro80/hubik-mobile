import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { ChatMapPicker, DEFAULT_CENTER } from '../ChatMapPicker';

const BARCELONA_COORDINATES = { latitude: 41.3851, longitude: 2.1734 };

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View };
});

describe('ChatMapPicker', () => {
  const mockOnConfirm = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders directly with provided initial coordinates without querying GPS', async () => {
    const { getByText, queryByTestId } = render(
      <ChatMapPicker
        visible={true}
        initialLatitude={40.425}
        initialLongitude={-3.69}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    expect(getByText('Confirmar ubicación')).toBeTruthy();
    expect(queryByTestId('map-location-loader')).toBeNull();
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('queries user position when no initial coordinates are provided and permission is granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'granted',
    });
    (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: BARCELONA_COORDINATES,
    });

    const { getByText, queryByTestId } = render(
      <ChatMapPicker
        visible={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(queryByTestId('map-location-loader')).toBeNull();
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);

    const confirmButton = getByText('Confirmar ubicación');
    fireEvent.press(confirmButton);
    expect(mockOnConfirm).toHaveBeenCalledWith(41.3851, 2.1734);
  });

  it('falls back to DEFAULT_CENTER when permission is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    const { getByText, queryByTestId } = render(
      <ChatMapPicker
        visible={true}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(queryByTestId('map-location-loader')).toBeNull();
    });

    const confirmButton = getByText('Confirmar ubicación');
    fireEvent.press(confirmButton);
    expect(mockOnConfirm).toHaveBeenCalledWith(
      DEFAULT_CENTER.latitude,
      DEFAULT_CENTER.longitude
    );
  });

  it('calls onClose when tapping the close button', () => {
    const { getByLabelText } = render(
      <ChatMapPicker
        visible={true}
        initialLatitude={40.42}
        initialLongitude={-3.7}
        onConfirm={mockOnConfirm}
        onClose={mockOnClose}
      />
    );

    const closeBtn = getByLabelText('Cerrar mapa');
    fireEvent.press(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
