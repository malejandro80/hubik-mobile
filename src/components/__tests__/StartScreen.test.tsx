import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StartScreen, StartScreenProps } from '../StartScreen';

const EXAMPLES = ['Pisos en venta en Valencia', 'Casas de 3 habitaciones en Madrid'];

const buildProps = (overrides: Partial<StartScreenProps> = {}): StartScreenProps => ({
  name: 'Ana',
  audience: 'agent',
  actions: ['search', 'register'],
  examples: EXAMPLES,
  onAction: jest.fn(),
  onExample: jest.fn(),
  ...overrides,
});

describe('StartScreen', () => {
  it('greets the signed-in user by name and asks what to do', () => {
    const { getByText } = render(<StartScreen {...buildProps()} />);

    expect(getByText('Hola, Ana')).toBeTruthy();
    expect(getByText('¿Qué va a publicar o buscar hoy?')).toBeTruthy();
  });

  it.each([
    ['visitor', 'Encuentre su próxima vivienda'],
    ['client', '¿Qué vivienda busca hoy?'],
    ['agent', '¿Qué va a publicar o buscar hoy?'],
    ['owner', 'Gestione su inmobiliaria y su equipo'],
  ] as const)('speaks to the %s audience', (audience, subtitle) => {
    const { getByText } = render(<StartScreen {...buildProps({ audience })} />);

    expect(getByText(subtitle)).toBeTruthy();
  });

  it('offers a client the way to create an agency', () => {
    const props = buildProps({ audience: 'client', actions: ['search', 'create_agency'] });
    const { getByLabelText } = render(<StartScreen {...props} />);

    fireEvent.press(getByLabelText('Crear mi inmobiliaria. Invite a sus agentes'));

    expect(props.onAction).toHaveBeenCalledWith('create_agency');
  });

  it('greets a visitor without a name with a plain welcome', () => {
    const { getByText, queryByText } = render(<StartScreen {...buildProps({ name: null })} />);

    expect(getByText('Bienvenido a Hubik')).toBeTruthy();
    expect(queryByText(/^Hola,/)).toBeNull();
  });

  it('shows one card per action with its title and hint', () => {
    const { getByText, queryByText } = render(<StartScreen {...buildProps()} />);

    expect(getByText('Empezar')).toBeTruthy();
    expect(getByText('Buscar propiedades')).toBeTruthy();
    expect(getByText('Publicar una propiedad')).toBeTruthy();
    expect(queryByText('Mi inmobiliaria')).toBeNull();
    expect(queryByText('Iniciar sesión')).toBeNull();
  });

  it('reports which card was tapped', () => {
    const props = buildProps({ actions: ['search', 'sign_in', 'my_agency'] });
    const { getByLabelText } = render(<StartScreen {...props} />);

    fireEvent.press(getByLabelText('Iniciar sesión. Con Google o Apple'));
    fireEvent.press(getByLabelText('Mi inmobiliaria. Agentes y propiedades'));

    expect(props.onAction).toHaveBeenNthCalledWith(1, 'sign_in');
    expect(props.onAction).toHaveBeenNthCalledWith(2, 'my_agency');
  });

  it('lists the example phrases and reports the one tapped', () => {
    const props = buildProps();
    const { getByText, getByLabelText } = render(<StartScreen {...props} />);

    expect(getByText('Pruebe a decir…')).toBeTruthy();
    fireEvent.press(getByLabelText('Probar: Casas de 3 habitaciones en Madrid'));

    expect(props.onExample).toHaveBeenCalledWith('Casas de 3 habitaciones en Madrid');
  });

  it('reminds the user that the microphone can be used', () => {
    const { getByText } = render(<StartScreen {...buildProps()} />);

    expect(getByText('Toque el micrófono para hablar')).toBeTruthy();
  });

  it('makes every card a button with a large touch target', () => {
    const { getAllByRole } = render(<StartScreen {...buildProps()} />);

    const buttons = getAllByRole('button');
    expect(buttons).toHaveLength(2 + EXAMPLES.length);
  });
});
