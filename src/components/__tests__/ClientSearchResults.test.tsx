import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ClientSearchResults } from '../ClientSearchResults';

const ANA = { userId: 'u1', displayName: 'Ana García', maskedEmail: 'a***@gmail.com' };
const NAMELESS = { userId: 'u2', displayName: null, maskedEmail: 'n***@correo.com' };

describe('ClientSearchResults', () => {
  it('renders nothing while idle', () => {
    const { toJSON } = render(<ClientSearchResults status="idle" results={[]} onPick={jest.fn()} />);

    expect(toJSON()).toBeNull();
  });

  it.each([
    ['loading', 'Buscando…'],
    ['rate_limited', 'Demasiadas búsquedas. Espere un momento e inténtelo de nuevo.'],
    ['error', 'No pudimos buscar. Puede escribir el correo completo.'],
  ] as const)('shows the %s message', (status, text) => {
    const { getByText } = render(<ClientSearchResults status={status} results={[]} onPick={jest.fn()} />);

    expect(getByText(text)).toBeTruthy();
  });

  it('says so when nothing matches and suggests inviting by email', () => {
    const { getByText } = render(<ClientSearchResults status="ready" results={[]} onPick={jest.fn()} />);

    expect(getByText('Sin coincidencias. Puede invitar con el correo completo.')).toBeTruthy();
  });

  it('lists each candidate with the name and the masked email', () => {
    const { getByText } = render(<ClientSearchResults status="ready" results={[ANA, NAMELESS]} onPick={jest.fn()} />);

    expect(getByText('Ana García')).toBeTruthy();
    expect(getByText('a***@gmail.com')).toBeTruthy();
    expect(getByText('Cliente sin nombre')).toBeTruthy();
    expect(getByText('n***@correo.com')).toBeTruthy();
  });

  it('reports the candidate that was tapped, through a labelled button', () => {
    const onPick = jest.fn();
    const { getByLabelText } = render(<ClientSearchResults status="ready" results={[ANA]} onPick={onPick} />);

    const row = getByLabelText('Elegir a Ana García, a***@gmail.com');
    expect(row.props.accessibilityRole).toBe('button');
    fireEvent.press(row);

    expect(onPick).toHaveBeenCalledWith(ANA);
  });
});
