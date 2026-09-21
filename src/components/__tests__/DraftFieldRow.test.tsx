import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DraftFieldRow } from '../DraftFieldRow';
import { PropertyDraft } from '../../types/property';

const draft: PropertyDraft = {
  operation_type: 'sale',
  property_type: 'Apartment',
  price: 175000,
  city: 'Valencia',
};

const renderRow = (
  field: Parameters<typeof DraftFieldRow>[0]['field'],
  status: Parameters<typeof DraftFieldRow>[0]['status'],
  onEdit = jest.fn(() => ({ ok: true as const, value: 1 }))
) => ({ onEdit, ...render(<DraftFieldRow field={field} status={status} draft={draft} onEdit={onEdit} />) });

describe('DraftFieldRow', () => {
  it('shows the label, the value and a status word for a filled field', () => {
    const { getByText } = renderRow('city', 'ok');

    expect(getByText('Ciudad')).toBeTruthy();
    expect(getByText('Valencia')).toBeTruthy();
    expect(getByText('Listo')).toBeTruthy();
  });

  it('shows a dash and "Falta" for a missing field', () => {
    const { getByText } = renderRow('address', 'missing');

    expect(getByText('—')).toBeTruthy();
    expect(getByText('Falta')).toBeTruthy();
  });

  it('marks a field the AI just filled as "Nuevo"', () => {
    const { getByText } = renderRow('price', 'changed');

    expect(getByText('Nuevo')).toBeTruthy();
    expect(getByText('175.000 €')).toBeTruthy();
  });

  it('describes the row to screen readers with its value and status', () => {
    const { getByLabelText } = renderRow('price', 'changed');

    expect(getByLabelText('Precio: 175.000 €, Nuevo. Toque para editar')).toBeTruthy();
  });

  it('opens an editor prefilled with the current value and saves it', () => {
    const { getByLabelText, onEdit, queryByLabelText } = renderRow('city', 'ok');

    fireEvent.press(getByLabelText('Ciudad: Valencia, Listo. Toque para editar'));
    const input = getByLabelText('Editar ciudad');
    expect(input.props.value).toBe('Valencia');

    fireEvent.changeText(input, 'Madrid');
    fireEvent.press(getByLabelText('Guardar'));

    expect(onEdit).toHaveBeenCalledWith('city', 'Madrid');
    expect(queryByLabelText('Editar ciudad')).toBeNull();
  });

  it('keeps the editor open and explains the problem when the value is rejected', () => {
    const onEdit = jest.fn(() => ({ ok: false as const, error: 'out_of_range' as const }));
    const { getByLabelText, getByText } = renderRow('price', 'ok', onEdit as never);

    fireEvent.press(getByLabelText('Precio: 175.000 €, Listo. Toque para editar'));
    fireEvent.changeText(getByLabelText('Editar precio'), '-5');
    fireEvent.press(getByLabelText('Guardar'));

    expect(getByText('Ese valor está fuera de rango.')).toBeTruthy();
    expect(getByLabelText('Editar precio')).toBeTruthy();
  });

  it('closes the editor without saving when cancelled', () => {
    const { getByLabelText, onEdit, queryByLabelText } = renderRow('city', 'ok');

    fireEvent.press(getByLabelText('Ciudad: Valencia, Listo. Toque para editar'));
    fireEvent.press(getByLabelText('Cancelar'));

    expect(onEdit).not.toHaveBeenCalled();
    expect(queryByLabelText('Editar ciudad')).toBeNull();
  });

  it('uses a numeric keyboard for numeric fields', () => {
    const { getByLabelText } = renderRow('price', 'ok');

    fireEvent.press(getByLabelText('Precio: 175.000 €, Listo. Toque para editar'));

    expect(getByLabelText('Editar precio').props.keyboardType).toBe('numeric');
  });

  it('offers the options for the property type and applies the picked one right away', () => {
    const { getByLabelText, getByText, onEdit } = renderRow('property_type', 'ok');

    fireEvent.press(getByLabelText('Tipo de propiedad: Piso, Listo. Toque para editar'));
    fireEvent.press(getByText('Casa'));

    expect(onEdit).toHaveBeenCalledWith('property_type', 'Single Family');
  });

  it('offers sale and rent for the operation and applies the picked one', () => {
    const { getByLabelText, getByText, onEdit } = renderRow('operation_type', 'ok');

    fireEvent.press(getByLabelText('Si es venta o alquiler: Venta, Listo. Toque para editar'));
    fireEvent.press(getByText('Alquiler'));

    expect(onEdit).toHaveBeenCalledWith('operation_type', 'rent');
  });
});
