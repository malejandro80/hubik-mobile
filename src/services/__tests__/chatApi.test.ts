import {
  sendChatQuery,
  sendChatQueryAudio,
  parsePromptFilters,
  fetchDynamicSuggestions,
  parsePropertyDraft,
  intakeProperty,
  intakePropertyAudio,
  publishProperty,
  generatePropertyDescription,
} from '../chatApi';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('chatApi - sendChatQuery (Supabase Edge Function)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes chat-query Edge Function and returns response on success', async () => {
    const mockApiResponse = {
      answer: 'Found 2 apartments in Austin',
      data: [
        {
          id: 'test-prop-1',
          title: 'Austin Condo',
          property_type: 'Apartment',
          price: 350000,
          bedrooms: 2,
          bathrooms: 2,
          square_meters: 93,
          city: 'Austin',
          address: '123 Main St',
          status: 'Available',
          image_url: 'https://example.com/img.jpg',
          images: [],
        },
      ],
      applied_filters: { city: 'Austin' },
    };

    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: mockApiResponse,
      error: null,
    });

    const result = await sendChatQuery('Austin 2-bed under $400k');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('chat-query', {
      body: { message: 'Austin 2-bed under $400k' },
    });
    expect(result).toEqual(mockApiResponse);
  });

  it('falls back to direct Supabase database query when Edge Function returns error', async () => {
    const mockDbData = [
      {
        id: 'db-prop-1',
        title: 'Austin Condo',
        property_type: 'Apartment',
        price: 350000,
        bedrooms: 2,
        bathrooms: 2,
        square_meters: 93,
        city: 'Austin',
        address: '123 Main St',
        status: 'Available',
        image_url: 'https://example.com/img.jpg',
        images: [],
      },
    ];

    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('Edge Function invocation error'),
    });

    const mockOrder = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValueOnce({ data: mockDbData, error: null });
    const mockSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: mockOrder,
      limit: mockLimit,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const result = await sendChatQuery('Austin 2-bed under $400k');

    expect(supabase.functions.invoke).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Austin Condo');
    expect(result.answer).toContain('base de datos');
  });

  it('applies an amenities containment filter on the direct-query fallback', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('Edge Function invocation error'),
    });

    const mockContains = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValueOnce({ data: [], error: null });
    const mockSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      contains: mockContains,
      order: mockOrder,
      limit: mockLimit,
    });
    mockOrder.mockReturnValue({ limit: mockLimit });

    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    await sendChatQuery('casas con piscina en Miami');

    expect(mockContains).toHaveBeenCalledWith('amenities', expect.arrayContaining(['piscina']));
  });

  it('parsePromptFilters correctly extracts structured filters', () => {
    const filters = parsePromptFilters('Denver 3-bed house under 700k');
    expect(filters.city).toBe('Denver');
    expect(filters.property_type).toBe('Single Family');
    expect(filters.min_bedrooms).toBe(3);
    expect(filters.max_price).toBe(700000);
  });

  it('parsePromptFilters extracts metric area filters (m2, m², sqm)', () => {
    const filtersM2 = parsePromptFilters('Miami condo under 120 m2');
    expect(filtersM2.max_square_meters).toBe(120);

    const filtersSqm = parsePromptFilters('Austin apartment over 80 sqm');
    expect(filtersSqm.min_square_meters).toBe(80);

    const filtersSqMetres = parsePromptFilters('Seattle home under 200 square meters');
    expect(filtersSqMetres.max_square_meters).toBe(200);

    const filtersFeet = parsePromptFilters('Denver house under 1000 sqft');
    expect(filtersFeet.max_square_meters).toBe(93);
  });

  it('parsePromptFilters extracts Spanish natural language queries', () => {
    const filters = parsePromptFilters('departamentos en Austin de menos de 100 m2');
    expect(filters.city).toBe('Austin');
    expect(filters.property_type).toBe('Apartment');
    expect(filters.max_square_meters).toBe(100);

    const filtersHouse = parsePromptFilters('casas familiares en Miami con más de 3 habitaciones por menos de 500k');
    expect(filtersHouse.city).toBe('Miami');
    expect(filtersHouse.property_type).toBe('Single Family');
    expect(filtersHouse.min_bedrooms).toBe(3);
    expect(filtersHouse.max_price).toBe(500000);

    const filtersSort = parsePromptFilters('los departamentos más baratos en Denver');
    expect(filtersSort.city).toBe('Denver');
    expect(filtersSort.property_type).toBe('Apartment');
    expect(filtersSort.sort_by).toBe('price_asc');
  });

  it('parsePromptFilters extracts amenity keywords as a structured filter', () => {
    const filters = parsePromptFilters('casas con piscina y garaje en Miami');
    expect(filters.city).toBe('Miami');
    expect(filters.amenities).toEqual(expect.arrayContaining(['piscina', 'garaje']));
  });

  it('parsePromptFilters omits the amenities key when nothing matches', () => {
    const filters = parsePromptFilters('casas en Miami');
    expect(filters.amenities).toBeUndefined();
  });

  it('fetchDynamicSuggestions generates dynamic query phrases in Spanish from Supabase properties', async () => {
    const mockData = [
      { city: 'Austin', property_type: 'Condo', price: 385000 },
      { city: 'Miami', property_type: 'Apartment', price: 890000 },
    ];

    const mockLimit = jest.fn().mockResolvedValueOnce({ data: mockData, error: null });
    const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const suggestions = await fetchDynamicSuggestions();

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toBe('Condominios en Austin por menos de $400k');
    expect(suggestions[1]).toBe('Departamentos en Miami por menos de $900k');
  });
});

describe('chatApi - sendChatQueryAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const audio = { data: 'YmFzZTY0LWF1ZGlv', mimeType: 'audio/mp4' };

  it('invokes chat-query with the audio payload and returns the transcript', async () => {
    const mockApiResponse = {
      answer: 'Encontré 1 apartamento en Austin',
      data: [],
      transcript: 'apartamentos en Austin',
    };
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: mockApiResponse,
      error: null,
    });

    const result = await sendChatQueryAudio(audio);

    expect(supabase.functions.invoke).toHaveBeenCalledWith('chat-query', {
      body: { audio },
    });
    expect(result).toEqual(mockApiResponse);
  });

  it('throws (no local fallback) when the Edge Function fails', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('Gemini unreachable'),
    });

    await expect(sendChatQueryAudio(audio)).rejects.toThrow('Gemini unreachable');
  });
});

describe('chatApi - intakePropertyAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const audio = { data: 'YmFzZTY0LWF1ZGlv', mimeType: 'audio/mp4' };

  it('invokes property-intake with the audio payload and returns the transcript', async () => {
    const mockResponse = {
      data: { operation_type: 'sale', property_type: 'Apartment' },
      missing_fields: ['price'],
      assistant_message: 'Me falta: precio.',
      ready_to_confirm: false,
      transcript: 'vendo mi piso',
    };
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
      error: null,
    });

    const result = await intakePropertyAudio(audio, {});

    expect(supabase.functions.invoke).toHaveBeenCalledWith('property-intake', {
      body: { audio, known: {} },
    });
    expect(result).toEqual(mockResponse);
  });

  it('throws (no local fallback) when the Edge Function fails', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('Gemini unreachable'),
    });

    await expect(intakePropertyAudio(audio, {})).rejects.toThrow('Gemini unreachable');
  });
});

describe('chatApi - parsePropertyDraft (heuristic extraction)', () => {
  it('extracts fields from a full natural language description', () => {
    const result = parsePropertyDraft(
      'Mi referencia catastral es 1234567VH5797S0001WX. Quiero poner a la venta mi piso en Madrid de 3 habitaciones y 2 baños, 90 metros cuadrados, en la calle Mayor 12, por 420.000 euros.',
      {}
    );

    expect(result.data.catastro).toBe('1234567VH5797S0001WX');
    expect(result.data.operation_type).toBe('sale');
    expect(result.data.property_type).toBe('Apartment');
    expect(result.data.city).toBe('Madrid');
    expect(result.data.bedrooms).toBe(3);
    expect(result.data.bathrooms).toBe(2);
    expect(result.data.square_meters).toBe(90);
    expect(result.data.address).toContain('Mayor');
    expect(result.data.price).toBe(420000);
    expect(result.missing_fields).toEqual([]);
    expect(result.ready_to_confirm).toBe(true);
  });

  it('extracts price from colloquial expressions like "80 mil dólares" or "80k"', () => {
    const result = parsePropertyDraft(
      'Es una propiedad para la venta, una casa, tiene 200 metros cuadrados, 5 habitaciones, 6 baños, el precio es de 80 mil dólares.',
      { catastro: 'LEGACY-E1F2A3B479302' }
    );

    expect(result.data.price).toBe(80000);
    expect(result.data.property_type).toBe('Single Family');
    expect(result.data.operation_type).toBe('sale');
    expect(result.data.bedrooms).toBe(5);
    expect(result.data.bathrooms).toBe(6);
    expect(result.data.square_meters).toBe(200);
    expect(result.missing_fields).not.toContain('price');
  });

  it('merges a partial reply into the already-known draft', () => {
    const known = {
      catastro: '1234567VH5797S0001WX',
      operation_type: 'sale' as const,
      property_type: 'Apartment' as const,
      city: 'Madrid',
    };
    const result = parsePropertyDraft('Son 3 habitaciones y 2 baños', known);

    expect(result.data).toMatchObject({
      catastro: '1234567VH5797S0001WX',
      operation_type: 'sale',
      property_type: 'Apartment',
      city: 'Madrid',
      bedrooms: 3,
      bathrooms: 2,
    });
    expect(result.missing_fields).toEqual(
      expect.arrayContaining(['price', 'square_meters', 'address'])
    );
    expect(result.ready_to_confirm).toBe(false);
    expect(result.assistant_message).toContain('precio');
    expect(result.assistant_message).not.toContain('Referencia catastral registrada');
  });

  it('recognizes rental intent', () => {
    const result = parsePropertyDraft('Quiero alquilar mi estudio en Barcelona', {});
    expect(result.data.operation_type).toBe('rent');
    expect(result.data.property_type).toBe('Studio');
    expect(result.data.city).toBe('Barcelona');
  });

  it('asks only for the cadastral reference when it is missing, even if other fields are also missing', () => {
    const result = parsePropertyDraft('Quiero alquilar mi estudio en Barcelona', {});
    expect(result.missing_fields).toContain('catastro');
    expect(result.assistant_message).toContain('referencia catastral');
    expect(result.assistant_message).not.toContain('precio');
  });

  it('extracts a standalone cadastral reference and moves on to the rest once it is set', () => {
    const result = parsePropertyDraft('1234567VH5797S0001WX', {});
    expect(result.data.catastro).toBe('1234567VH5797S0001WX');
    expect(result.missing_fields).not.toContain('catastro');
    expect(result.assistant_message).toContain('precio');
  });

  it('gives immediate feedback the moment a cadastral reference is newly provided', () => {
    const result = parsePropertyDraft('1234567VH5797S0001WX', {});
    expect(result.assistant_message).toContain('Referencia catastral registrada');
  });

  it('does not repeat the cadastral feedback once it was already known on a prior turn', () => {
    const known = { catastro: '1234567VH5797S0001WX' };
    const result = parsePropertyDraft('Son 3 habitaciones', known);
    expect(result.assistant_message).not.toContain('Referencia catastral registrada');
  });

  it('extracts LEGACY- prefixed cadastral references from database seed/migrations', () => {
    const result = parsePropertyDraft('LEGACY-E1F2A3B479302', {});
    expect(result.data.catastro).toBe('LEGACY-E1F2A3B479302');
    expect(result.missing_fields).not.toContain('catastro');
  });

  it('extracts cadastral references with spaces and normalizes them', () => {
    const result = parsePropertyDraft('9872023 VH5797S 0001 WX', {});
    expect(result.data.catastro).toBe('9872023VH5797S0001WX');
    expect(result.missing_fields).not.toContain('catastro');
  });

  it('extracts amenities mentioned in the message', () => {
    const result = parsePropertyDraft('Tiene piscina y garaje', {});
    expect(result.data.amenities).toEqual(expect.arrayContaining(['piscina', 'garaje']));
  });

  it('merges newly-mentioned amenities additively without dropping earlier ones', () => {
    const known = { amenities: ['piscina'] };
    const result = parsePropertyDraft('también tiene garaje', known);
    expect(result.data.amenities).toEqual(expect.arrayContaining(['piscina', 'garaje']));
  });

  it('never blocks ready_to_confirm on amenities', () => {
    const known = {
      catastro: '1234567VH5797S0001WX',
      operation_type: 'sale' as const,
      property_type: 'Apartment' as const,
      price: 200000,
      bedrooms: 2,
      bathrooms: 1,
      square_meters: 80,
      city: 'Madrid',
      address: 'Calle Mayor 1',
    };
    const result = parsePropertyDraft('sin comodidades adicionales', known);
    expect(result.ready_to_confirm).toBe(true);
  });
});

describe('chatApi - intakeProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes property-intake Edge Function and returns its response on success', async () => {
    const mockResponse = {
      data: { operation_type: 'sale', property_type: 'Apartment' },
      missing_fields: ['price'],
      assistant_message: 'Me falta: precio.',
      ready_to_confirm: false,
    };
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: mockResponse,
      error: null,
    });

    const result = await intakeProperty('vendo mi piso', {});

    expect(supabase.functions.invoke).toHaveBeenCalledWith('property-intake', {
      body: { message: 'vendo mi piso', known: {} },
    });
    expect(result).toEqual(mockResponse);
  });

  it('falls back to local heuristic extraction when the Edge Function fails', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('unreachable'),
    });

    const result = await intakeProperty('Quiero alquilar mi estudio en Barcelona', {});

    expect(result.data.operation_type).toBe('rent');
    expect(result.data.property_type).toBe('Studio');
  });
});

describe('chatApi - publishProperty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const completeDraft = {
    operation_type: 'sale' as const,
    property_type: 'Apartment' as const,
    price: 420000,
    bedrooms: 3,
    bathrooms: 2,
    square_meters: 90,
    city: 'Madrid',
    address: 'Calle Mayor 12',
  };

  it('invokes property-publish Edge Function and returns the created property', async () => {
    const mockProperty = { id: 'new-prop-1', title: 'Piso en venta en Madrid', ...completeDraft, status: 'Available', image_url: '', images: [] };
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: { property: mockProperty },
      error: null,
    });

    const result = await publishProperty(completeDraft);

    expect(supabase.functions.invoke).toHaveBeenCalledWith('property-publish', {
      body: { property: completeDraft },
    });
    expect(result).toEqual(mockProperty);
  });

  it('falls back to a direct Supabase insert when the Edge Function is unreachable', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('unreachable'),
    });

    const insertedRow = { id: 'new-prop-2', title: 'Piso en venta en Madrid', ...completeDraft, status: 'Available', images: [] };
    const mockSingle = jest.fn().mockResolvedValueOnce({ data: insertedRow, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const result = await publishProperty(completeDraft);

    expect(supabase.from).toHaveBeenCalledWith('properties');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Madrid', status: 'Available' })
    );
    expect(result).toEqual(insertedRow);
  });

  it('passes images, coordinates and the AI description through to the direct insert fallback', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({ data: null, error: new Error('unreachable') });

    const mockSingle = jest.fn().mockResolvedValueOnce({ data: {}, error: null });
    const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await publishProperty({
      ...completeDraft,
      images: ['https://storage.example.com/a.jpg'],
      latitude: 40.4168,
      longitude: -3.7038,
      description: 'Piso luminoso en el centro de Madrid.',
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        images: ['https://storage.example.com/a.jpg'],
        latitude: 40.4168,
        longitude: -3.7038,
        description: 'Piso luminoso en el centro de Madrid.',
      })
    );
  });
});

describe('chatApi - generatePropertyDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes property-describe and returns the generated description', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: { description: 'Piso luminoso en el centro de Madrid.' },
      error: null,
    });

    const known = { city: 'Madrid', property_type: 'Apartment' as const, price: 420000 };
    const result = await generatePropertyDescription(known);

    expect(supabase.functions.invoke).toHaveBeenCalledWith('property-describe', {
      body: { known },
    });
    expect(result).toEqual({ description: 'Piso luminoso en el centro de Madrid.' });
  });

  it('throws when the Edge Function fails, with no local fallback', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('unreachable'),
    });

    await expect(generatePropertyDescription({})).rejects.toThrow();
  });
});
