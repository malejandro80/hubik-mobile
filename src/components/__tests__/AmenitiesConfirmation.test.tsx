import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AmenitiesConfirmation } from '../AmenitiesConfirmation';

describe('AmenitiesConfirmation', () => {
  it('renders detected amenities as chips', () => {
    const { getByText } = render(
      <AmenitiesConfirmation amenities={['piscina', 'garaje']} onChange={jest.fn()} />
    );
    expect(getByText('piscina')).toBeTruthy();
    expect(getByText('garaje')).toBeTruthy();
  });

  it('shows an empty-state message when there are no amenities yet', () => {
    const { getByText } = render(<AmenitiesConfirmation amenities={[]} onChange={jest.fn()} />);
    expect(getByText('Aún no detecté comodidades. Puede agregarlas abajo.')).toBeTruthy();
  });

  it('removes an amenity when its chip is pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <AmenitiesConfirmation amenities={['piscina', 'garaje']} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Quitar piscina'));
    expect(onChange).toHaveBeenCalledWith(['garaje']);
  });

  it('adds a new amenity via the text input', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <AmenitiesConfirmation amenities={['piscina']} onChange={onChange} />
    );
    fireEvent.changeText(getByPlaceholderText('Agregar comodidad o característica...'), 'Terraza');
    fireEvent.press(getByLabelText('Agregar comodidad'));
    expect(onChange).toHaveBeenCalledWith(['piscina', 'terraza']);
  });

  it('does not add a duplicate or empty amenity', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <AmenitiesConfirmation amenities={['piscina']} onChange={onChange} />
    );
    fireEvent.changeText(getByPlaceholderText('Agregar comodidad o característica...'), 'piscina');
    fireEvent.press(getByLabelText('Agregar comodidad'));
    fireEvent.changeText(getByPlaceholderText('Agregar comodidad o característica...'), '   ');
    fireEvent.press(getByLabelText('Agregar comodidad'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
