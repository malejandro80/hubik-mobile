import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LivingDraftCard } from '../LivingDraftCard';
import { getFieldStatuses } from '../../lib/draftStatus';
import { PropertyDraft } from '../../types/property';

describe('LivingDraftCard', () => {
  it('shows known fields with their formatted values and missing fields as chips', () => {
    const draft: PropertyDraft = {
      catastro: '1234567VH5797S0001WX',
      operation_type: 'sale',
      city: 'Madrid',
    };
    const missingFields: (keyof PropertyDraft)[] = [
      'property_type',
      'price',
      'bedrooms',
      'bathrooms',
      'square_meters',
      'address',
    ];

    const { getByText, getByLabelText } = render(
      <LivingDraftCard
        draft={draft}
        missingFields={missingFields}
        onQuickAnswer={jest.fn()}
        onSelectField={jest.fn()}
      />
    );

    expect(getByText('Madrid')).toBeTruthy();
    expect(getByText('Venta')).toBeTruthy();
    expect(getByLabelText('Completar precio')).toBeTruthy();
    expect(getByLabelText('Completar tipo de propiedad')).toBeTruthy();
  });

  it('hints the input with the field label when tapping a free-value missing chip', () => {
    const onSelectField = jest.fn();
    const { getByLabelText } = render(
      <LivingDraftCard
        draft={{}}
        missingFields={['price']}
        onQuickAnswer={jest.fn()}
        onSelectField={onSelectField}
      />
    );

    fireEvent.press(getByLabelText('Completar precio'));

    expect(onSelectField).toHaveBeenCalledWith('precio');
  });

  it('expands an inline picker for property_type and sends the picked option', () => {
    const onQuickAnswer = jest.fn();
    const { getByLabelText, getByText, queryByText } = render(
      <LivingDraftCard
        draft={{}}
        missingFields={['property_type']}
        onQuickAnswer={onQuickAnswer}
        onSelectField={jest.fn()}
      />
    );

    expect(queryByText('Piso')).toBeNull();

    fireEvent.press(getByLabelText('Completar tipo de propiedad'));
    expect(getByText('Piso')).toBeTruthy();

    fireEvent.press(getByLabelText('Tipo de propiedad: Casa'));

    expect(onQuickAnswer).toHaveBeenCalledWith('Casa');
  });

  it('expands an inline picker for operation_type and sends the picked option', () => {
    const onQuickAnswer = jest.fn();
    const { getByLabelText } = render(
      <LivingDraftCard
        draft={{}}
        missingFields={['operation_type']}
        onQuickAnswer={onQuickAnswer}
        onSelectField={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText('Completar si es venta o alquiler'));
    fireEvent.press(getByLabelText('Operación: Alquiler'));

    expect(onQuickAnswer).toHaveBeenCalledWith('Alquiler');
  });
});

describe('LivingDraftCard editable mode', () => {
  const draft: PropertyDraft = { operation_type: 'sale', price: 175000, city: 'Valencia' };
  const statuses = getFieldStatuses(draft, ['price']);

  it('shows one row per required field with a status word instead of chips', () => {
    const { getByText, getAllByText } = render(
      <LivingDraftCard draft={draft} missingFields={[]} statuses={statuses} onEditField={jest.fn()} />
    );

    expect(getByText('Ficha en progreso')).toBeTruthy();
    expect(getByText('Nuevo')).toBeTruthy();
    expect(getAllByText('Listo')).toHaveLength(2);
    expect(getAllByText('Falta')).toHaveLength(6);
  });

  it('lists the cadastral reference last', () => {
    const { getAllByLabelText } = render(
      <LivingDraftCard draft={draft} missingFields={[]} statuses={statuses} onEditField={jest.fn()} />
    );

    const rows = getAllByLabelText(/Toque para editar/);
    expect(rows[rows.length - 1].props.accessibilityLabel).toContain('Referencia catastral');
  });

  it('sends an inline edit to onEditField', () => {
    const onEditField = jest.fn(() => ({ ok: true as const, value: 'Madrid' }));
    const { getByLabelText } = render(
      <LivingDraftCard draft={draft} missingFields={[]} statuses={statuses} onEditField={onEditField} />
    );

    fireEvent.press(getByLabelText('Ciudad: Valencia, Listo. Toque para editar'));
    fireEvent.changeText(getByLabelText('Editar ciudad'), 'Madrid');
    fireEvent.press(getByLabelText('Guardar'));

    expect(onEditField).toHaveBeenCalledWith('city', 'Madrid');
  });
});
