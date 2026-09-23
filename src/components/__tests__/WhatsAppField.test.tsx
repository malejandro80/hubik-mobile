import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { WhatsAppField } from '../WhatsAppField';

const renderField = (value: string | null, onSave = jest.fn().mockResolvedValue(undefined)) => ({
  onSave,
  ...render(<WhatsAppField title="WhatsApp de contacto" value={value} onSave={onSave} />),
});

describe('WhatsAppField', () => {
  it('invites to add a number when there is none', () => {
    const { getByText, getByLabelText } = renderField(null);

    expect(getByText('WhatsApp de contacto')).toBeTruthy();
    expect(getByLabelText('Añadir WhatsApp')).toBeTruthy();
  });

  it('saves a valid number in international format', async () => {
    const { getByLabelText, getByPlaceholderText, onSave } = renderField(null);

    fireEvent.press(getByLabelText('Añadir WhatsApp'));
    fireEvent.changeText(getByPlaceholderText('+58 414 123 4567'), '+58 414-123 4567');
    fireEvent.press(getByLabelText('Guardar'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('+584141234567'));
  });

  it('refuses a number without country code and explains why', () => {
    const { getByLabelText, getByPlaceholderText, getByText, onSave } = renderField(null);

    fireEvent.press(getByLabelText('Añadir WhatsApp'));
    fireEvent.changeText(getByPlaceholderText('+58 414 123 4567'), '0414 123');
    fireEvent.press(getByLabelText('Guardar'));

    expect(onSave).not.toHaveBeenCalled();
    expect(getByText(/código de país/)).toBeTruthy();
  });

  it('shows the saved number and lets it be removed', async () => {
    const { getByText, getByLabelText, onSave } = renderField('+584141234567');

    expect(getByText('+584141234567')).toBeTruthy();
    fireEvent.press(getByLabelText('Cambiar WhatsApp'));
    fireEvent.press(getByLabelText('Quitar'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(null));
  });

  it('keeps editing and shows an error when saving fails', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('offline'));
    const { getByLabelText, getByPlaceholderText, findByText } = renderField(null, onSave);

    fireEvent.press(getByLabelText('Añadir WhatsApp'));
    fireEvent.changeText(getByPlaceholderText('+58 414 123 4567'), '+584141234567');
    fireEvent.press(getByLabelText('Guardar'));

    expect(await findByText('No se pudo guardar. Inténtelo de nuevo.')).toBeTruthy();
    expect(getByPlaceholderText('+58 414 123 4567')).toBeTruthy();
  });
});
