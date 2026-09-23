import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ChatMessageItem } from '../ChatMessageItem';
import { ChatMessage, Property } from '../../types/property';
import { TYPEWRITER_WORD_INTERVAL_MS } from '../../constants/typewriter';

const property: Property = {
  id: 'p1',
  title: 'Piso luminoso',
  property_type: 'Apartment',
  price: 180000,
  bedrooms: 2,
  bathrooms: 1,
  square_meters: 75,
  city: 'Valencia',
  address: 'Centro',
  status: 'Available',
  image_url: '',
  images: [],
  amenities: [],
};

const reply: ChatMessage = {
  id: 'a1',
  sender: 'assistant',
  text: 'Hay un piso en Valencia',
  properties: [property],
  suggestions: ['Pisos en Madrid'],
  timestamp: 'Ahora',
};

describe('ChatMessageItem typewriter', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('writes the text in before showing the cards and chips, then reports it is written', () => {
    const onWritten = jest.fn();
    const { queryByText, getByText, queryByLabelText } = render(
      <ChatMessageItem message={reply} animate onWritten={onWritten} onSuggestionPress={jest.fn()} />
    );

    act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 2));
    expect(getByText('Hay un')).toBeTruthy();
    expect(queryByText('Piso luminoso')).toBeNull();
    expect(queryByLabelText('Search for Pisos en Madrid')).toBeNull();

    act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 10));
    expect(getByText('Hay un piso en Valencia')).toBeTruthy();
    expect(getByText('Piso luminoso')).toBeTruthy();
    expect(queryByLabelText('Search for Pisos en Madrid')).toBeTruthy();
    expect(onWritten).toHaveBeenCalledTimes(1);
  });

  it('gives screen readers the full reply while it is being written', () => {
    const { getByLabelText } = render(<ChatMessageItem message={reply} animate />);

    expect(getByLabelText('Hay un piso en Valencia')).toBeTruthy();
  });

  it('shows everything at once without animation', () => {
    const { getByText } = render(<ChatMessageItem message={reply} />);

    expect(getByText('Hay un piso en Valencia')).toBeTruthy();
    expect(getByText('Piso luminoso')).toBeTruthy();
  });
});
