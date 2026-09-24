import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { LandlordPicker } from '../LandlordPicker';
import { searchLandlordCandidates } from '../../services/authApi';
import { CLIENT_SEARCH_DEBOUNCE_MS } from '../../constants/clientSearch';

jest.mock('../../services/authApi', () => ({
  searchLandlordCandidates: jest.fn(),
  searchAgentCandidates: jest.fn(),
}));

const ana = { userId: 'c1', displayName: 'Ana García', maskedEmail: 'a***@gmail.com' };

describe('LandlordPicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (searchLandlordCandidates as jest.Mock).mockResolvedValue([ana]);
  });
  afterEach(() => jest.useRealTimers());

  it('searches registered clients as the agent types and picks one', async () => {
    const onChange = jest.fn();
    const { getByLabelText, findByText } = render(<LandlordPicker value={null} onChange={onChange} />);

    fireEvent.changeText(getByLabelText('Buscar propietario por nombre o correo'), 'ana');
    await act(async () => {
      jest.advanceTimersByTime(CLIENT_SEARCH_DEBOUNCE_MS);
    });

    expect(searchLandlordCandidates).toHaveBeenCalledWith('ana');
    fireEvent.press(await findByText(/Ana García/));
    expect(onChange).toHaveBeenCalledWith(ana);
  });

  it('shows the chosen landlord with its masked email and lets it be removed', () => {
    const onChange = jest.fn();
    const { getByText, getByLabelText, queryByLabelText } = render(<LandlordPicker value={ana} onChange={onChange} />);

    expect(getByText('Ana García · a***@gmail.com')).toBeTruthy();
    expect(queryByLabelText('Buscar propietario por nombre o correo')).toBeNull();
    fireEvent.press(getByLabelText('Quitar propietario'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('marks the field as optional', () => {
    const { getByText } = render(<LandlordPicker value={null} onChange={jest.fn()} />);

    expect(getByText('Propietario (opcional)')).toBeTruthy();
  });
});
