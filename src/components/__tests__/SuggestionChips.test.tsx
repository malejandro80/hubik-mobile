import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SuggestionChips } from '../SuggestionChips';

describe('SuggestionChips Component', () => {
  const mockChips = ['Austin 2-bed', 'Denver home'];
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all suggestion chips', () => {
    const { getByText } = render(
      <SuggestionChips chips={mockChips} onSelectChip={mockOnSelect} />
    );

    expect(getByText(/Austin 2-bed/)).toBeTruthy();
    expect(getByText(/Denver home/)).toBeTruthy();
  });

  it('calls onSelectChip when a chip is pressed', () => {
    const { getByText } = render(
      <SuggestionChips chips={mockChips} onSelectChip={mockOnSelect} />
    );

    fireEvent.press(getByText(/Austin 2-bed/));
    expect(mockOnSelect).toHaveBeenCalledWith('Austin 2-bed');
  });

  it('disables chips when disabled prop is true', () => {
    const { getByLabelText } = render(
      <SuggestionChips
        chips={mockChips}
        onSelectChip={mockOnSelect}
        disabled={true}
      />
    );

    const button = getByLabelText('Search for Austin 2-bed');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });
});
