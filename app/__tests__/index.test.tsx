import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../index';
import * as chatApi from '../../src/services/chatApi';

jest.mock('../../src/services/chatApi', () => ({
  sendChatQuery: jest.fn(),
}));

describe('HomeScreen (Chat UI)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header, initial welcome message, and suggestion chips', () => {
    const { getByText, getByPlaceholderText } = render(<HomeScreen />);

    expect(getByText('Hubik Real Estate AI')).toBeTruthy();
    expect(getByText(/Welcome to Hubik Real Estate AI/)).toBeTruthy();
    expect(getByText(/Austin 2-bed under \$400k/)).toBeTruthy();
    expect(
      getByPlaceholderText('Ask about properties, cities, prices...')
    ).toBeTruthy();
  });

  it('sends query when typing and tapping send button', async () => {
    const mockProperty = {
      id: 'prop-1',
      title: 'Modern Austin Apartment',
      property_type: 'Apartment',
      price: 375000,
      bedrooms: 2,
      bathrooms: 2,
      square_feet: 1000,
      city: 'Austin',
      address: '200 Congress Ave',
      status: 'Available',
      image_url: 'https://example.com/photo.jpg',
      images: [],
    };

    (chatApi.sendChatQuery as jest.Mock).mockResolvedValueOnce({
      answer: 'Found 1 property in Austin',
      data: [mockProperty],
    });

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    const input = getByPlaceholderText('Ask about properties, cities, prices...');
    const sendButton = getByText('Send');

    fireEvent.changeText(input, '2-bed in Austin');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(chatApi.sendChatQuery).toHaveBeenCalledWith('2-bed in Austin');
    });

    await waitFor(() => {
      expect(getByText('Found 1 property in Austin')).toBeTruthy();
      expect(getByText('Modern Austin Apartment')).toBeTruthy();
    });
  });

  it('sends query when pressing a suggestion chip', async () => {
    (chatApi.sendChatQuery as jest.Mock).mockResolvedValueOnce({
      answer: 'Showing luxury condos in Miami',
      data: [],
    });

    const { getByText } = render(<HomeScreen />);
    const chip = getByText(/Luxury condos in Miami/);

    fireEvent.press(chip);

    await waitFor(() => {
      expect(chatApi.sendChatQuery).toHaveBeenCalledWith('Luxury condos in Miami');
    });

    await waitFor(() => {
      expect(getByText('Showing luxury condos in Miami')).toBeTruthy();
    });
  });

  it('displays helpful error message when API call fails', async () => {
    (chatApi.sendChatQuery as jest.Mock).mockRejectedValueOnce(
      new Error('Network request failed')
    );

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    const input = getByPlaceholderText('Ask about properties, cities, prices...');
    const sendButton = getByText('Send');

    fireEvent.changeText(input, 'Any houses in Denver');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText(/Could not connect to API server/)).toBeTruthy();
    });
  });
});
