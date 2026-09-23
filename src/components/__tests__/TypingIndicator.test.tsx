import React from 'react';
import { render } from '@testing-library/react-native';
import { TypingIndicator } from '../TypingIndicator';

jest.mock('../../hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));

describe('TypingIndicator', () => {
  it('tells the user that Hubik is writing', () => {
    const { getByText, getByLabelText } = render(<TypingIndicator />);

    expect(getByText('Hubik está escribiendo…')).toBeTruthy();
    expect(getByLabelText('Hubik está escribiendo…')).toBeTruthy();
  });
});
