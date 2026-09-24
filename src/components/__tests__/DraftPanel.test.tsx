import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DraftPanel, DraftPanelProps } from '../DraftPanel';
import { PropertyDraft } from '../../types/property';

const COMPLETE: PropertyDraft = {
  catastro: '9872023VH5797S0001WX',
  operation_type: 'sale',
  property_type: 'Apartment',
  price: 180000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Valencia',
  address: 'Calle Colón 12',
};

const buildProps = (overrides: Partial<DraftPanelProps> = {}): DraftPanelProps => ({
  draft: {},
  recentlyChanged: [],
  describing: false,
  descriptionFailed: false,
  describedFrom: null,
  publishing: false,
  onEditField: jest.fn(() => ({ ok: true as const, value: 1 })),
  onAddPhotos: jest.fn(),
  onRemovePhoto: jest.fn(),
  onMovePhoto: jest.fn(),
  onPickLocation: jest.fn(),
  onAmenitiesChange: jest.fn(),
  onRequestDescription: jest.fn(),
  onPublish: jest.fn(),
  onPreview: jest.fn(),
  ...overrides,
});

const renderPanel = (overrides: Partial<DraftPanelProps> = {}) => {
  const props = buildProps(overrides);
  return { props, ...render(<DraftPanel {...props} />) };
};

const expand = (utils: ReturnType<typeof renderPanel>) =>
  fireEvent.press(utils.getByLabelText('Ver la ficha completa'));

describe('DraftPanel collapsed', () => {
  it('shows progress and the photo/location chips for an empty draft', () => {
    const { getByText } = renderPanel();

    expect(getByText('0 de 9 datos')).toBeTruthy();
    expect(getByText('Añadir fotos')).toBeTruthy();
    expect(getByText('Marcar ubicación')).toBeTruthy();
  });

  it('counts filled fields, photos and the pin', () => {
    const { getByText } = renderPanel({
      draft: { city: 'Valencia', price: 1, bedrooms: 2, images: ['a', 'b'], latitude: 1, longitude: 2 },
    });

    expect(getByText('3 de 9 datos')).toBeTruthy();
    expect(getByText('2 fotos')).toBeTruthy();
    expect(getByText('Ubicación marcada')).toBeTruthy();
  });

  it('hides the full card until expanded', () => {
    const { queryByText } = renderPanel();

    expect(queryByText('Ficha en progreso')).toBeNull();
  });

  it('says what is left to publish, or names what still needs a photo or a pin', () => {
    const blocked = renderPanel({ draft: { city: 'Valencia' } });
    expect(blocked.getByText('Faltan 8 datos')).toBeTruthy();

    const readyNoMedia = renderPanel({ draft: COMPLETE });
    expect(readyNoMedia.getByText('Faltan fotos y ubicación')).toBeTruthy();

    const readyWithMedia = renderPanel({ draft: { ...COMPLETE, images: ['a'], latitude: 1, longitude: 2 } });
    expect(readyWithMedia.getByText('Fotos y ubicación listas')).toBeTruthy();
  });
});

describe('DraftPanel photo and location chips', () => {
  it('opens the photo picker and the map picker from the chips, without expanding', () => {
    const { getByLabelText, props } = renderPanel();

    fireEvent.press(getByLabelText('Añadir fotos'));
    fireEvent.press(getByLabelText('Marcar ubicación en el mapa'));

    expect(props.onAddPhotos).toHaveBeenCalledTimes(1);
    expect(props.onPickLocation).toHaveBeenCalledTimes(1);
  });

  it('switches to a done state once a photo and a pin exist', () => {
    const { getByText, getByLabelText } = renderPanel({
      draft: { images: ['a', 'b'], latitude: 1, longitude: 2 },
    });

    expect(getByText('2 fotos')).toBeTruthy();
    expect(getByText('Toque para gestionar')).toBeTruthy();
    expect(getByText('Ubicación marcada')).toBeTruthy();
    expect(getByText('Toque para cambiar')).toBeTruthy();
    expect(getByLabelText('Cambiar ubicación en el mapa, ya marcada')).toBeTruthy();
  });

  it('offers to reorder photos from the chip once there are at least two, without expanding', () => {
    const onOrderPhotos = jest.fn();
    const single = renderPanel({ draft: { images: ['a'] }, onOrderPhotos });
    expect(single.queryByLabelText('Ordenar las fotos')).toBeNull();

    const multiple = renderPanel({ draft: { images: ['a', 'b'] }, onOrderPhotos });
    fireEvent.press(multiple.getByLabelText('Ordenar las fotos'));
    expect(onOrderPhotos).toHaveBeenCalledTimes(1);
  });

  it('does not offer to reorder photos when no handler is given', () => {
    const { queryByLabelText } = renderPanel({ draft: { images: ['a', 'b'] } });
    expect(queryByLabelText('Ordenar las fotos')).toBeNull();
  });
});

describe('DraftPanel publish button', () => {
  it('is unavailable while required fields are missing', () => {
    const { getByLabelText, props } = renderPanel({ draft: { city: 'Valencia' } });

    const button = getByLabelText('Publicar propiedad, no disponible. Faltan 8 datos');
    fireEvent.press(button);

    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(props.onPublish).not.toHaveBeenCalled();
  });

  it('publishes when every required field is present', () => {
    const { getByLabelText, props } = renderPanel({ draft: COMPLETE });

    fireEvent.press(getByLabelText('Publicar propiedad'));

    expect(props.onPublish).toHaveBeenCalledTimes(1);
  });

  it('shows progress and blocks a second tap while publishing', () => {
    const { getByText, getByLabelText, props } = renderPanel({ draft: COMPLETE, publishing: true });

    expect(getByText('Publicando…')).toBeTruthy();
    fireEvent.press(getByLabelText('Publicar propiedad'));
    expect(props.onPublish).not.toHaveBeenCalled();
  });
});

describe('DraftPanel preview button', () => {
  it('is unavailable while required fields are missing', () => {
    const { getByLabelText, props } = renderPanel({ draft: { city: 'Valencia' } });

    const button = getByLabelText('Vista previa, no disponible hasta completar los datos');
    fireEvent.press(button);

    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(props.onPreview).not.toHaveBeenCalled();
  });

  it('opens the preview once every required field is present', () => {
    const { getByLabelText, props } = renderPanel({ draft: COMPLETE });

    fireEvent.press(getByLabelText('Ver cómo quedará el anuncio'));

    expect(props.onPreview).toHaveBeenCalledTimes(1);
  });

  it('stays available in the collapsed panel and while publishing is idle', () => {
    const { getByText } = renderPanel({ draft: COMPLETE });

    expect(getByText('Vista previa')).toBeTruthy();
  });
});

describe('DraftPanel expanded', () => {
  it('expands and collapses from the toggle', () => {
    const utils = renderPanel();

    expand(utils);
    expect(utils.getByText('Ficha en progreso')).toBeTruthy();

    fireEvent.press(utils.getByLabelText('Ocultar la ficha'));
    expect(utils.queryByText('Ficha en progreso')).toBeNull();
  });

  it('lists up to three suggestions', () => {
    const utils = renderPanel();
    expand(utils);

    expect(utils.getByText('Sugerencias')).toBeTruthy();
    expect(utils.getAllByText(/Añada al menos 3 fotos|Marque la ubicación|Mencione las comodidades/).length).toBeGreaterThanOrEqual(3);
  });

  it('lets the agent fix a field from the card', () => {
    const utils = renderPanel({ draft: { city: 'Valencia' } });
    expand(utils);

    fireEvent.press(utils.getByLabelText('Ciudad: Valencia, Listo. Toque para editar'));
    fireEvent.changeText(utils.getByLabelText('Editar ciudad'), 'Madrid');
    fireEvent.press(utils.getByLabelText('Guardar'));

    expect(utils.props.onEditField).toHaveBeenCalledWith('city', 'Madrid');
  });

  it('asks to mark the location, or to change it once set', () => {
    const empty = renderPanel();
    expand(empty);
    expect(empty.getByText('Aún sin marcar')).toBeTruthy();
    fireEvent.press(empty.getByLabelText('Marcar en el mapa'));
    expect(empty.props.onPickLocation).toHaveBeenCalledTimes(1);

    const pinned = renderPanel({ draft: { latitude: 39.47, longitude: -0.37 } });
    expand(pinned);
    expect(pinned.getByText('Marcada: 39.4700, -0.3700')).toBeTruthy();
    fireEvent.press(pinned.getByLabelText('Cambiar ubicación'));
    expect(pinned.props.onPickLocation).toHaveBeenCalledTimes(1);
  });

  it('adds more photos from the grid', () => {
    const utils = renderPanel({ draft: { images: ['file://a.jpg'] } });
    expand(utils);

    fireEvent.press(utils.getByLabelText('Añadir más fotos'));

    expect(utils.props.onAddPhotos).toHaveBeenCalledTimes(1);
  });

  it('shows the amenities chips', () => {
    const utils = renderPanel({ draft: { amenities: ['piscina'] } });
    expand(utils);

    expect(utils.getByText('Comodidades detectadas')).toBeTruthy();
    expect(utils.getByText('piscina')).toBeTruthy();
  });
});

describe('DraftPanel description', () => {
  it('waits for the main data before writing the description', () => {
    const utils = renderPanel();
    expand(utils);

    expect(utils.getByText('Se redactará sola cuando estén los datos principales.')).toBeTruthy();
  });

  it('shows progress while the AI writes it', () => {
    const utils = renderPanel({ draft: COMPLETE, describing: true });
    expand(utils);

    expect(utils.getByText('Redactando la descripción…')).toBeTruthy();
  });

  it('offers to write it when it is ready and there is none', () => {
    const utils = renderPanel({ draft: COMPLETE });
    expand(utils);

    fireEvent.press(utils.getByLabelText('Redactar con IA'));

    expect(utils.props.onRequestDescription).toHaveBeenCalledTimes(1);
  });

  it('shows the description and lets the agent regenerate it', () => {
    const utils = renderPanel({ draft: { ...COMPLETE, description: 'Un piso luminoso.' } });
    expand(utils);

    expect(utils.getByText('Un piso luminoso.')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Regenerar descripción'));

    expect(utils.props.onRequestDescription).toHaveBeenCalledTimes(1);
  });

  it('explains a failure and offers a retry without blocking publishing', () => {
    const utils = renderPanel({ draft: COMPLETE, descriptionFailed: true });
    expand(utils);

    expect(utils.getByText('No pude redactar la descripción. Puede reintentar o publicar sin ella.')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Reintentar'));

    expect(utils.props.onRequestDescription).toHaveBeenCalledTimes(1);
    expect(utils.getByLabelText('Publicar propiedad').props.accessibilityState.disabled).toBeFalsy();
  });

  it('offers the optional landlord picker when the screen handles it', () => {
    const onLandlordChange = jest.fn();
    const utils = renderPanel({
      landlord: { userId: 'c1', displayName: 'Ana García', maskedEmail: 'a***@gmail.com' },
      onLandlordChange,
    });
    expand(utils);
    const { getByText, getByLabelText } = utils;

    expect(getByText('Propietario (opcional)')).toBeTruthy();
    fireEvent.press(getByLabelText('Quitar propietario'));
    expect(onLandlordChange).toHaveBeenCalledWith(null);
  });
});

