import React from 'react';
import { Linking, Platform } from 'react-native';
import { configure, fireEvent, render, waitFor } from '@testing-library/react-native';
import SharedPropertyScreen from '../p';
import SharedPropertySlugRoute from '../p/[slug]';
import { fetchSharedPropertyByRef } from '../../services/sharedProperty';

const ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';
const STORE = 'https://apps.apple.com/app/hubik/id1';

let mockParams: { id?: string; slug?: string } = { id: ID };
let mockStoreUrl = STORE;

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../services/sharedProperty', () => ({
  fetchSharedPropertyByRef: jest.fn(),
}));

jest.mock('../../constants/appStore', () => ({
  get IOS_STORE_URL() {
    return mockStoreUrl;
  },
  ANDROID_STORE_URL: '',
  IOS_USER_AGENT_PATTERN: /iPhone|iPad|iPod/i,
  ANDROID_USER_AGENT_PATTERN: /Android/i,
}));

const fetchMock = fetchSharedPropertyByRef as jest.Mock;

const PROPERTY = {
  id: ID,
  title: 'Piso luminoso en Madrid',
  property_type: 'Apartment',
  price: 420000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Madrid',
  address: 'Calle Mayor 12',
  description: 'Un piso reformado junto al parque.',
  status: 'Available',
  image_url: 'https://cdn.example.com/cover.jpg',
  images: ['https://cdn.example.com/cover.jpg'],
  amenities: [],
  agency_name: 'Casa Norte',
  agent_name: 'Ana Pérez',
};

const SHEET_TITLE = 'Vea más propiedades en la app de Hubik';

describe('SharedPropertyScreen', () => {
  beforeAll(() => {
    configure({ defaultIncludeHiddenElements: true });
  });

  afterAll(() => {
    configure({ defaultIncludeHiddenElements: false });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockParams = { id: ID };
    mockStoreUrl = STORE;
    fetchMock.mockResolvedValue(PROPERTY);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the property to a visitor with no account, and the install sheet over it', async () => {
    const { findByText, getByText } = render(<SharedPropertyScreen />);

    expect(await findByText('Piso luminoso en Madrid')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith({ kind: 'id', id: ID });
    expect(getByText('$420,000')).toBeTruthy();
    expect(getByText(SHEET_TITLE)).toBeTruthy();
  });

  it('shows the sheet while the property is still loading', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { getByText } = render(<SharedPropertyScreen />);

    expect(getByText('Cargando la propiedad…')).toBeTruthy();
    expect(getByText(SHEET_TITLE)).toBeTruthy();
  });

  it('keeps an install bar after the sheet is dismissed, and reopens the sheet from it', async () => {
    const { findByText, getByText, queryByText, getByLabelText } = render(<SharedPropertyScreen />);
    await findByText('Piso luminoso en Madrid');
    expect(queryByText('Hubik · Mejor en la app')).toBeNull();

    fireEvent.press(getByText('Seguir en el navegador'));

    expect(queryByText(SHEET_TITLE)).toBeNull();
    expect(getByText('Hubik · Mejor en la app')).toBeTruthy();
    expect(getByText('Piso luminoso en Madrid')).toBeTruthy();

    fireEvent.press(getByLabelText('Ver cómo descargar la app de Hubik'));

    expect(getByText(SHEET_TITLE)).toBeTruthy();
    expect(queryByText('Hubik · Mejor en la app')).toBeNull();
  });

  it('opens the store from the download button', async () => {
    const { findByText, getByLabelText } = render(<SharedPropertyScreen />);
    await findByText('Piso luminoso en Madrid');

    fireEvent.press(getByLabelText('Descargar la app de Hubik'));

    expect(Linking.openURL).toHaveBeenCalledWith(STORE);
  });

  it('says "Próximamente" while no store link is configured', async () => {
    mockStoreUrl = '';
    const { findByText, getByText } = render(<SharedPropertyScreen />);
    await findByText('Piso luminoso en Madrid');

    expect(getByText('Próximamente')).toBeTruthy();
  });

  it('shows the not-available page and the sheet when the listing does not exist', async () => {
    fetchMock.mockResolvedValue(null);
    const { findByText, getByText } = render(<SharedPropertyScreen />);

    expect(await findByText('Esta propiedad ya no está disponible')).toBeTruthy();
    expect(getByText(SHEET_TITLE)).toBeTruthy();
  });

  it.each([
    ['a missing id', {}],
    ['a malformed id', { id: 'not-an-id' }],
  ])('shows the not-available page for %s without asking the server', async (_label, params) => {
    mockParams = params;
    const { findByText } = render(<SharedPropertyScreen />);

    expect(await findByText('Esta propiedad ya no está disponible')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows an error with a retry, and loads the property on retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(PROPERTY);
    const { findByText, getByText, getByLabelText } = render(<SharedPropertyScreen />);

    expect(await findByText('No pudimos cargar la propiedad.')).toBeTruthy();
    expect(getByText(SHEET_TITLE)).toBeTruthy();
    fireEvent.press(getByLabelText('Reintentar'));

    await waitFor(() => expect(getByText('Piso luminoso en Madrid')).toBeTruthy());
  });

  describe('open in the app', () => {
    const originalDocument = (global as { document?: unknown }).document;
    const assign = jest.fn();

    beforeEach(() => {
      assign.mockClear();
      (global as { document?: unknown }).document = {
        location: { assign },
        visibilityState: 'visible',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
    });

    afterEach(() => {
      (global as { document?: unknown }).document = originalDocument;
    });

    it('opens the listing in the app from the sheet, using its readable address', async () => {
      const { findByText, getByLabelText } = render(<SharedPropertyScreen />);
      await findByText('Piso luminoso en Madrid');

      fireEvent.press(getByLabelText('Abrir este anuncio en la app de Hubik'));

      expect(assign).toHaveBeenCalledWith('hubikmobile://p/piso-luminoso-en-madrid-3f2b1c9e');
    });

    it('offers no open button when there is no listing to open', async () => {
      fetchMock.mockResolvedValue(null);
      const { findByText, queryByLabelText } = render(<SharedPropertyScreen />);
      await findByText('Esta propiedad ya no está disponible');

      expect(queryByLabelText('Abrir este anuncio en la app de Hubik')).toBeNull();
    });
  });
});

describe('SharedPropertySlugRoute', () => {
  beforeAll(() => {
    configure({ defaultIncludeHiddenElements: true });
  });

  afterAll(() => {
    configure({ defaultIncludeHiddenElements: false });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'web');
    mockStoreUrl = STORE;
    fetchMock.mockResolvedValue(PROPERTY);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the listing from its readable address', async () => {
    mockParams = { slug: 'piso-luminoso-en-madrid-3f2b1c9e' };
    const { findByText } = render(<SharedPropertySlugRoute />);

    expect(await findByText('Piso luminoso en Madrid')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith({
      kind: 'slug',
      slug: 'piso-luminoso-en-madrid-3f2b1c9e',
      shortId: '3f2b1c9e',
    });
  });

  it('shows the not-available page for an address that is not a listing address', async () => {
    mockParams = { slug: 'no-es-una-propiedad' };
    const { findByText } = render(<SharedPropertySlugRoute />);

    expect(await findByText('Esta propiedad ya no está disponible')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('shared listing links inside the app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue(PROPERTY);
  });

  it('turns a shared address into the normal property screen instead of the web page', async () => {
    mockParams = { slug: 'piso-luminoso-en-madrid-3f2b1c9e' };
    const { queryByText } = render(<SharedPropertySlugRoute />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/property/[id]',
      params: expect.objectContaining({ id: ID, title: 'Piso luminoso en Madrid' }),
    });
    expect(queryByText('Vea más propiedades en la app de Hubik')).toBeNull();
  });

  it('does the same for the older ?id= address', async () => {
    mockParams = { id: ID };
    render(<SharedPropertyScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));

    expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/property/[id]' }));
  });
});

