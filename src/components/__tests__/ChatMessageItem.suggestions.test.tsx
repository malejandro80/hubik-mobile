import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChatMessageItem } from '../ChatMessageItem';
import { ChatMessage } from '../../types/property';

const reply: ChatMessage = {
  id: 'a1',
  sender: 'assistant',
  text: 'Hay 2 pisos en Valencia desde 180.000 €.',
  suggestions: ['Pisos en Madrid', 'Casas en Valencia'],
  timestamp: 'Ahora',
};

const chip = (text: string) => `Search for ${text}`;

describe('ChatMessageItem suggestions', () => {
  it('shows the suggestions as chips when it can report a tap', () => {
    const onSuggestionPress = jest.fn();
    const { getByLabelText } = render(<ChatMessageItem message={reply} onSuggestionPress={onSuggestionPress} />);

    fireEvent.press(getByLabelText(chip('Casas en Valencia')));

    expect(onSuggestionPress).toHaveBeenCalledWith('Casas en Valencia');
  });

  it('hides the chips when no tap handler is given', () => {
    const { queryByLabelText } = render(<ChatMessageItem message={reply} />);

    expect(queryByLabelText(chip('Pisos en Madrid'))).toBeNull();
  });

  it('disables the chips while a search is running', () => {
    const { getByLabelText } = render(
      <ChatMessageItem message={reply} onSuggestionPress={jest.fn()} suggestionsDisabled />
    );

    expect(getByLabelText('Search for Pisos en Madrid').props.accessibilityState).toEqual({ disabled: true });
  });

  it('never shows chips on a user message', () => {
    const { queryByLabelText } = render(
      <ChatMessageItem message={{ ...reply, sender: 'user' }} onSuggestionPress={jest.fn()} />
    );

    expect(queryByLabelText(chip('Pisos en Madrid'))).toBeNull();
  });
});
