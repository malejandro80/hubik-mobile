import { GeminiService } from '../geminiService';
import { PropertyRepository } from '../propertyRepository';

describe('GeminiService Query Pipeline', () => {
  let repository: PropertyRepository;
  let service: GeminiService;

  beforeEach(() => {
    repository = new PropertyRepository({ useFallbackOnly: true });
    service = new GeminiService(repository);
  });

  it('processes natural language query for Austin 2-bed under $400k', async () => {
    const response = await service.processQuery(
      'Show me 2-bedroom apartments in Austin under $400k'
    );

    expect(response.answer).toBeDefined();
    expect(typeof response.answer).toBe('string');
    expect(response.data).toBeInstanceOf(Array);
    expect(response.data.length).toBeGreaterThan(0);

    response.data.forEach((property) => {
      expect(property.city.toLowerCase()).toBe('austin');
      expect(property.bedrooms).toBeGreaterThanOrEqual(2);
      expect(property.price).toBeLessThanOrEqual(400000);
      expect(property.image_url).toBeDefined();
    });
  });

  it('processes queries with no matches gracefully', async () => {
    const response = await service.processQuery(
      'Show me 5-bedroom houses in Honolulu under $100k'
    );

    expect(response.answer).toBeDefined();
    expect(response.data).toEqual([]);
    expect(response.answer).toMatch(/couldn't find|no properties|expand/i);
  });
});
