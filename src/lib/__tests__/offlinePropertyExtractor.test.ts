import {
  buildAssistantMessage,
  extractCatastro,
  extractCatastroSkip,
  extractOperationType,
  extractPrice,
  generatePropertyTitle,
  parsePropertyDraft,
} from '../offlinePropertyExtractor';

describe('offlinePropertyExtractor', () => {
  describe('extractOperationType', () => {
    it('detects rent keywords', () => {
      expect(extractOperationType('quiero alquilar un piso')).toBe('rent');
      expect(extractOperationType('en alquiler en madrid')).toBe('rent');
      expect(extractOperationType('para renta mensual')).toBe('rent');
      expect(extractOperationType('en arriendo')).toBe('rent');
    });

    it('detects sale keywords', () => {
      expect(extractOperationType('está en venta')).toBe('sale');
      expect(extractOperationType('vendo bonito apartamento')).toBe('sale');
      expect(extractOperationType('for sale')).toBe('sale');
    });

    it('returns undefined when no operation keywords match', () => {
      expect(extractOperationType('piso de 3 habitaciones')).toBeUndefined();
    });
  });

  describe('extractPrice', () => {
    it('parses prices with mil or k suffix', () => {
      expect(extractPrice('el precio es de 120 mil euros')).toBe(120000);
      expect(extractPrice('cuesta 85k')).toBe(85000);
      expect(extractPrice('$150.5 mil')).toBe(150500);
    });

    it('parses prices with millones suffix', () => {
      expect(extractPrice('vale 1.2 millones')).toBe(1200000);
      expect(extractPrice('pido 2m')).toBe(2000000);
    });

    it('parses grouped numeric currency formats', () => {
      expect(extractPrice('precio: 250.000 €')).toBe(250000);
      expect(extractPrice('son $180,000')).toBe(180000);
      expect(extractPrice('cuesta 95000 usd')).toBe(95000);
    });

    it('returns undefined if no price is found', () => {
      expect(extractPrice('casa amplia en valencia')).toBeUndefined();
    });
  });

  describe('extractCatastro', () => {
    it('detects legacy references', () => {
      expect(extractCatastro('referencia LEGACY-ABC12345 en trámite', false)).toBe('LEGACY-ABC12345');
    });

    it('detects spaced Spanish cadastral references', () => {
      const spaced = '9872023 VH5797S 0001 WX';
      expect(extractCatastro(`catastro ${spaced}`, false)).toBe('9872023VH5797S0001WX');
    });

    it('detects hyphenated cadastral references', () => {
      const hyphenated = '9872023-VH5797S-0001-WX';
      expect(extractCatastro(`la ref es ${hyphenated}`, false)).toBe('9872023VH5797S0001WX');
    });

    it('detects standard alphanumeric references', () => {
      const standard = '1234567AB1234C0001DE';
      expect(extractCatastro(`ref: ${standard}`, false)).toBe(standard);
    });

    it('allows short trimmed references if not already provided', () => {
      expect(extractCatastro('A123', false)).toBe('A123');
    });
  });

  describe('generatePropertyTitle', () => {
    it('generates standard localized title', () => {
      expect(
        generatePropertyTitle({
          property_type: 'Apartment',
          operation_type: 'sale',
          city: 'Valencia',
        })
      ).toBe('Piso en venta en Valencia');

      expect(
        generatePropertyTitle({
          property_type: 'Single Family',
          operation_type: 'rent',
          city: 'Madrid',
        })
      ).toBe('Casa en alquiler en Madrid');
    });

    it('falls back gracefully when fields are missing', () => {
      expect(generatePropertyTitle({})).toBe('Propiedad en venta');
    });
  });

  describe('buildAssistantMessage', () => {
    it('returns confirmation when no fields are missing', () => {
      const message = buildAssistantMessage([]);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('returns invitation when all fields are missing', () => {
      const message = buildAssistantMessage([
        'catastro',
        'property_type',
        'operation_type',
        'price',
        'bedrooms',
        'bathrooms',
        'square_meters',
        'city',
        'address',
      ]);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('requests missing fields with labels', () => {
      const message = buildAssistantMessage(['bedrooms', 'bathrooms']);
      expect(message).toContain('habitaciones');
      expect(message).toContain('baños');
    });
  });

  describe('parsePropertyDraft', () => {
    it('extracts all relevant details into draft structure', () => {
      const message = 'Vendo piso en Valencia calle Colón 10 con 3 habitaciones, 2 baños, 110 m2 por 220 mil euros ref 9872023VH5797S0001WX piscina';
      const result = parsePropertyDraft(message, {});

      expect(result.data.property_type).toBe('Apartment');
      expect(result.data.operation_type).toBe('sale');
      expect(result.data.city).toBe('Valencia');
      expect(result.data.address).toBe('calle Colón 10 con 3 habitaciones');
      expect(result.data.bedrooms).toBe(3);
      expect(result.data.bathrooms).toBe(2);
      expect(result.data.square_meters).toBe(110);
      expect(result.data.price).toBe(220000);
      expect(result.data.catastro).toBe('9872023VH5797S0001WX');
      expect(result.data.amenities).toContain('piscina');
      expect(result.ready_to_confirm).toBe(true);
      expect(result.missing_fields).toHaveLength(0);
    });

    it('merges with existing known draft fields', () => {
      const known = {
        catastro: '9872023VH5797S0001WX',
        property_type: 'Apartment' as const,
        operation_type: 'rent' as const,
      };
      const message = 'pido 1500 euros y son 2 habitaciones en Madrid';
      const result = parsePropertyDraft(message, known);

      expect(result.data.catastro).toBe('9872023VH5797S0001WX');
      expect(result.data.property_type).toBe('Apartment');
      expect(result.data.operation_type).toBe('rent');
      expect(result.data.city).toBe('Madrid');
      expect(result.data.price).toBe(1500);
      expect(result.data.bedrooms).toBe(2);
    });

    it('marks ready to confirm when user explicitly indicates they have no catastro', () => {
      const message = 'Vendo piso en Valencia calle Colón 10 con 3 habitaciones, 2 baños, 110 m2 por 220 mil euros no tengo catastro';
      const result = parsePropertyDraft(message, {});

      expect(result.data.property_type).toBe('Apartment');
      expect(result.data.catastro).toBeUndefined();
      expect(result.data.catastro_skipped).toBe(true);
      expect(result.ready_to_confirm).toBe(true);
      expect(result.missing_fields).toHaveLength(0);
    });

    it('resolves remaining catastro requirement when user replies saying they do not have it', () => {
      const known = {
        property_type: 'Apartment' as const,
        operation_type: 'sale' as const,
        price: 180000,
        bedrooms: 3,
        bathrooms: 2,
        square_meters: 90,
        city: 'Valencia',
        address: 'Calle Colón 12',
      };
      const result = parsePropertyDraft('no lo tengo', known);

      expect(result.data.catastro).toBeUndefined();
      expect(result.data.catastro_skipped).toBe(true);
      expect(result.ready_to_confirm).toBe(true);
      expect(result.missing_fields).toEqual([]);
    });

    it('allows providing catastro after having previously skipped it', () => {
      const known = {
        property_type: 'Apartment' as const,
        operation_type: 'sale' as const,
        price: 180000,
        bedrooms: 3,
        bathrooms: 2,
        square_meters: 90,
        city: 'Valencia',
        address: 'Calle Colón 12',
        catastro_skipped: true,
      };
      const result = parsePropertyDraft('9872023VH5797S0001WX', known);

      expect(result.data.catastro).toBe('9872023VH5797S0001WX');
      expect(result.data.catastro_skipped).toBe(false);
      expect(result.ready_to_confirm).toBe(true);
      expect(result.missing_fields).toEqual([]);
    });
  });

  describe('extractCatastroSkip', () => {
    it('detects explicit catastro skip phrases', () => {
      expect(extractCatastroSkip('no tengo catastro', false)).toBe(true);
      expect(extractCatastroSkip('sin catastro', false)).toBe(true);
      expect(extractCatastroSkip('no tengo cédula catastral', false)).toBe(true);
      expect(extractCatastroSkip('omitir catastro', false)).toBe(true);
      expect(extractCatastroSkip('no dispongo de catastro', false)).toBe(true);
    });

    it('detects contextual skip only when catastro is the sole remaining field', () => {
      expect(extractCatastroSkip('no tengo', true)).toBe(true);
      expect(extractCatastroSkip('no lo tengo', true)).toBe(true);
      expect(extractCatastroSkip('omitir', true)).toBe(true);
      expect(extractCatastroSkip('paso', true)).toBe(true);
      expect(extractCatastroSkip('no tengo', false)).toBe(false);
      expect(extractCatastroSkip('gracias', true)).toBe(false);
    });
  });
});
