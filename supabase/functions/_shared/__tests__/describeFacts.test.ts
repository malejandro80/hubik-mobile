import { describableFacts } from '../describeFacts';

describe('describableFacts', () => {
  const draft = {
    catastro: '9872023VH5797S0001WX',
    title: 'Piso en Valencia',
    city: 'Valencia',
    address: 'Avenida Zule, Calle López',
    latitude: 39.47,
    longitude: -0.37,
    price: 20000,
    currency: 'EUR',
    bedrooms: 2,
    amenities: ['terraza'],
  };

  it('never passes the street address, coordinates or cadastral reference to the copywriter', () => {
    const facts = describableFacts(draft);
    expect(facts).not.toHaveProperty('address');
    expect(facts).not.toHaveProperty('latitude');
    expect(facts).not.toHaveProperty('longitude');
    expect(facts).not.toHaveProperty('catastro');
    expect(JSON.stringify(facts)).not.toContain('López');
  });

  it('keeps the public facts, including city and amenities', () => {
    expect(describableFacts(draft)).toEqual({
      title: 'Piso en Valencia',
      city: 'Valencia',
      price: 20000,
      currency: 'EUR',
      bedrooms: 2,
      amenities: ['terraza'],
    });
  });
});
