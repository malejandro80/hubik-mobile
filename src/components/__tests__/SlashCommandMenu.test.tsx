import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SlashCommandMenu } from '../SlashCommandMenu';
import { SlashMenuState } from '../../lib/slashCommands';

const commandsState: SlashMenuState = {
  kind: 'commands',
  commands: [{ key: 'register', command: '/agregar-propiedad', capability: 'canRegisterProperty' }],
};

describe('SlashCommandMenu', () => {
  it('renders nothing when hidden', () => {
    const { toJSON } = render(<SlashCommandMenu state={{ kind: 'hidden' }} onSelect={jest.fn()} />);

    expect(toJSON()).toBeNull();
  });

  it('shows each command with its hint as a button', () => {
    const { getByText, getByLabelText } = render(<SlashCommandMenu state={commandsState} onSelect={jest.fn()} />);

    expect(getByText('/agregar-propiedad')).toBeTruthy();
    expect(getByText('Publicar una propiedad')).toBeTruthy();
    expect(getByLabelText('/agregar-propiedad, Publicar una propiedad').props.accessibilityRole).toBe('button');
  });

  it('reports the command that was tapped', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(<SlashCommandMenu state={commandsState} onSelect={onSelect} />);

    fireEvent.press(getByLabelText('/agregar-propiedad, Publicar una propiedad'));

    expect(onSelect).toHaveBeenCalledWith('/agregar-propiedad');
  });

  it('shows the note when no command is available, without any button', () => {
    const { getByText, queryAllByRole } = render(<SlashCommandMenu state={{ kind: 'note' }} onSelect={jest.fn()} />);

    expect(getByText('Los comandos están disponibles para agentes de una inmobiliaria')).toBeTruthy();
    expect(queryAllByRole('button')).toHaveLength(0);
  });
});
