import {
  buildAskPayload,
  comparableFacts,
  listingFacts,
  parseAskRequest,
  screenAnswer,
  sensitiveTopic,
} from '../propertyAsk';
import { ASK_REFUSAL, MAX_ANSWER_LENGTH, MAX_COMPARABLES, MAX_HISTORY_TURNS } from '../propertyAskConstants';

const LISTING_ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';
const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';

const row = {
  id: LISTING_ID,
  title: 'Casa en alquiler en El Bosque',
  property_type: 'Single Family',
  operation_type: 'rent',
  price: 850,
  currency: 'USD',
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 220,
  city: 'Valencia',
  sector: 'El Bosque',
  description: 'Casa amplia con jardín.',
  amenities: ['jardín', 'garaje'],
  address: 'Calle 5, casa 12',
  latitude: 10.2,
  longitude: -68.0,
  catastro: 'VAL-001',
  agent_name: 'Ana Pérez',
  agency_name: 'Casa Norte',
  contact_whatsapp: '+584141234567',
  created_by: 'user-1',
  agency_id: 'agency-1',
};

describe('parseAskRequest', () => {
  it('accepts a question about a listing id or a share token', () => {
    expect(parseAskRequest({ question: ' ¿Qué tal la zona? ', target: { kind: 'listing', id: LISTING_ID } })).toEqual({
      question: '¿Qué tal la zona?',
      target: { kind: 'listing', id: LISTING_ID },
      history: [],
    });
    expect(parseAskRequest({ question: 'hola', target: { kind: 'shared', token: TOKEN } })?.target).toEqual({
      kind: 'shared',
      token: TOKEN,
    });
  });

  it('rejects empty or oversized questions and unknown targets', () => {
    expect(parseAskRequest({ question: '   ', target: { kind: 'listing', id: LISTING_ID } })).toBeNull();
    expect(parseAskRequest({ question: 'x'.repeat(301), target: { kind: 'listing', id: LISTING_ID } })).toBeNull();
    expect(parseAskRequest({ question: 'hola', target: { kind: 'listing', id: 'draft' } })).toBeNull();
    expect(parseAskRequest({ question: 'hola', target: { kind: 'shared', token: LISTING_ID } })).toBeNull();
    expect(parseAskRequest({ question: 'hola' })).toBeNull();
    expect(parseAskRequest(null)).toBeNull();
  });

  it('keeps only the last valid history turns, trimmed', () => {
    const history = [
      { question: 'q1', answer: 'a1' },
      { question: 'q2', answer: 'a2' },
      { question: 42, answer: 'bad' },
      { question: 'q3', answer: 'a3' },
      { question: 'q4', answer: 'a4' },
      { question: ' q5 ', answer: ' a5 ' },
    ];
    const parsed = parseAskRequest({ question: 'y?', target: { kind: 'listing', id: LISTING_ID }, history });

    expect(parsed?.history).toHaveLength(MAX_HISTORY_TURNS);
    expect(parsed?.history[MAX_HISTORY_TURNS - 1]).toEqual({ question: 'q5', answer: 'a5' });
    expect(parsed?.history.map((turn) => turn.question)).not.toContain(42);
  });
});

describe('sensitiveTopic', () => {
  it.each([
    ['Dame el teléfono del dueño', 'owner'],
    ['¿Quién es el propietario?', 'owner'],
    ['¿Cuál es la dirección exacta?', 'exact_location'],
    ['pásame las coordenadas', 'exact_location'],
    ['¿cuál es la referencia catastral?', 'cadastre'],
    ['dame el celular del asesor', 'personal_contact'],
    ['¿cuál es el correo de Ana?', 'personal_contact'],
    ['¿qué otros clientes la han visitado?', 'other_clients'],
    ['¿cuál es el precio mínimo que aceptan?', 'unpublished_terms'],
    ['¿es negociable?', 'unpublished_terms'],
  ])('flags %p as %p', (question, topic) => {
    expect(sensitiveTopic(question)).toBe(topic);
  });

  it.each(['¿Qué tal el tráfico por la zona?', '¿Qué ventajas tiene frente a otras casas?', '¿Es buena para niños?'])(
    'lets %p through',
    (question) => {
      expect(sensitiveTopic(question)).toBeNull();
    }
  );
});

describe('listingFacts', () => {
  it('keeps only public facts', () => {
    const facts = listingFacts(row);

    expect(facts).toEqual({
      title: 'Casa en alquiler en El Bosque',
      property_type: 'Single Family',
      operation_type: 'rent',
      price: 850,
      currency: 'USD',
      bedrooms: 3,
      bathrooms: 2,
      square_meters: 220,
      city: 'Valencia',
      sector: 'El Bosque',
      description: 'Casa amplia con jardín.',
      amenities: ['jardín', 'garaje'],
    });
  });
});

describe('comparableFacts', () => {
  const others = Array.from({ length: 12 }, (_, index) => ({
    ...row,
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    title: `Casa ${index}`,
    price: 1000 + index * 100,
    square_meters: 200,
  }));

  it('drops the listing itself, keeps public facts and adds the price per m²', () => {
    const facts = comparableFacts([row, ...others], { id: LISTING_ID, title: row.title, price: row.price });

    expect(facts).toHaveLength(MAX_COMPARABLES);
    expect(facts.map((fact) => fact.title)).not.toContain(row.title);
    expect(facts[0]).toEqual({
      title: 'Casa 0',
      property_type: 'Single Family',
      operation_type: 'rent',
      price: 1000,
      currency: 'USD',
      bedrooms: 3,
      bathrooms: 2,
      square_meters: 200,
      city: 'Valencia',
      sector: 'El Bosque',
      amenities: ['jardín', 'garaje'],
      price_per_m2: 5,
    });
  });

  it('drops a shared listing by title and price when its id is unknown', () => {
    const facts = comparableFacts([row, ...others.slice(0, 2)], { title: row.title, price: row.price });

    expect(facts.map((fact) => fact.title)).toEqual(['Casa 0', 'Casa 1']);
  });
});

describe('buildAskPayload', () => {
  it('serialises the question, listing, comparables and history as data', () => {
    const payload = JSON.parse(
      buildAskPayload({
        question: '¿Y el tráfico?',
        listing: listingFacts(row),
        comparables: [],
        history: [{ question: 'hola', answer: 'buenas' }],
      })
    );

    expect(payload).toEqual({
      question: '¿Y el tráfico?',
      listing: listingFacts(row),
      comparables: [],
      history: [{ question: 'hola', answer: 'buenas' }],
    });
    expect(JSON.stringify(payload)).not.toMatch(/Calle 5|VAL-001|Ana Pérez|584141234567/);
  });
});

describe('screenAnswer', () => {
  it('trims and keeps a normal answer', () => {
    expect(screenAnswer('  El Bosque suele ser tranquilo.  ')).toEqual({ answer: 'El Bosque suele ser tranquilo.', refused: false });
  });

  it.each([
    'Llama al +58 414 123 4567 para más datos.',
    'Escribe a ana@correo.com',
    'Mira https://example.com/dueno',
  ])('replaces an answer that leaks contact data: %p', (text) => {
    expect(screenAnswer(text)).toEqual({ answer: ASK_REFUSAL, refused: true });
  });

  it('caps very long answers and rejects empty ones', () => {
    expect(screenAnswer('a'.repeat(MAX_ANSWER_LENGTH + 50))?.answer).toHaveLength(MAX_ANSWER_LENGTH);
    expect(screenAnswer('   ')).toBeNull();
    expect(screenAnswer(null)).toBeNull();
  });

  it('keeps prices and sizes, which are not contact data', () => {
    expect(screenAnswer('Cuesta 850 USD al mes por 220 m², unos 3,86 USD por m².')?.refused).toBe(false);
  });
});
