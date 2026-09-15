import { PropertyRepository } from '../propertyRepository';

describe('PropertyRepository', () => {
  let repository: PropertyRepository;

  beforeEach(() => {
    // Instantiate repository in local fallback mode
    repository = new PropertyRepository({ useFallbackOnly: true });
  });

  it('filters by city correctly (case-insensitive)', async () => {
    const results = await repository.filterProperties({ city: 'Austin' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((p) => {
      expect(p.city.toLowerCase()).toBe('austin');
    });
  });

  it('filters by bedrooms and max_price', async () => {
    const results = await repository.filterProperties({
      city: 'Austin',
      property_type: 'Apartment',
      min_bedrooms: 2,
      max_price: 400000,
    });
    expect(results.length).toBeGreaterThan(0);
    results.forEach((p) => {
      expect(p.city.toLowerCase()).toBe('austin');
      expect(p.property_type).toBe('Apartment');
      expect(p.bedrooms).toBeGreaterThanOrEqual(2);
      expect(p.price).toBeLessThanOrEqual(400000);
    });
  });

  it('sorts by price ascending', async () => {
    const results = await repository.filterProperties({
      sort_by: 'price_asc',
      limit: 5,
    });
    expect(results.length).toBe(5);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
    }
  });

  it('sorts by price descending', async () => {
    const results = await repository.filterProperties({
      sort_by: 'price_desc',
      limit: 5,
    });
    expect(results.length).toBe(5);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeLessThanOrEqual(results[i - 1].price);
    }
  });

  it('returns empty array when no properties match criteria', async () => {
    const results = await repository.filterProperties({
      city: 'Tokyo',
    });
    expect(results).toEqual([]);
  });

  it('performs semantic vector search with cosine similarity', async () => {
    // Dummy 768-dim embedding
    const queryVector = new Array(768).fill(0.05);
    const results = await repository.semanticSearchProperties(queryVector, 3);
    expect(results.length).toBe(3);
    expect(results[0].similarity).toBeDefined();
    expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity || 0);
  });
});
