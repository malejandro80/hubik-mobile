import { labels } from '../../constants/labels';
import { Property, PropertyDraft } from '../../types/property';
import {
  buildDraftPreviewProperty,
  buildInitialMessages,
  buildPropertyRouteParams,
  formatDraftSummary,
  formatOutcomeMessage,
  generateMessageId,
  isConfirmIntent,
  isContinueIntent,
  isLocationIntent,
  isPhotosIntent,
} from '../chatRegistration';

describe('chatRegistration library', () => {
  describe('Intent Detectors', () => {
    it('detects confirm intents', () => {
      expect(isConfirmIntent('confirmar y publicar')).toBe(true);
      expect(isConfirmIntent('¡Sí, dale!')).toBe(true);
      expect(isConfirmIntent('correcto')).toBe(true);
      expect(isConfirmIntent('buscar departamento')).toBe(false);
    });

    it('detects continue intents (skip photos)', () => {
      expect(isContinueIntent('continuar sin fotos')).toBe(true);
      expect(isContinueIntent('omitir')).toBe(true);
      expect(isContinueIntent('no por ahora')).toBe(true);
      expect(isContinueIntent('subir fotos')).toBe(false);
    });

    it('detects location intents', () => {
      expect(isLocationIntent('fijar ubicación')).toBe(true);
      expect(isLocationIntent('abrir mapa')).toBe(true);
      expect(isLocationIntent('marcar mapa')).toBe(true);
      expect(isLocationIntent('confirmar')).toBe(false);
    });

    it('detects photos intents', () => {
      expect(isPhotosIntent('adjuntar fotos')).toBe(true);
      expect(isPhotosIntent('subir fotos')).toBe(true);
      expect(isPhotosIntent('continuar sin fotos')).toBe(false);
    });
  });

  describe('formatDraftSummary', () => {
    it('formats a complete draft summary using labels and markdown', () => {
      const draft: PropertyDraft = {
        catastro: '1234567VH5797S0001WX',
        operation_type: 'sale',
        property_type: 'Apartment',
        price: 320000,
        bedrooms: 2,
        bathrooms: 2,
        square_meters: 85,
        address: 'Calle Mayor 10',
        city: 'Madrid',
      };
      const summary = formatDraftSummary(draft, labels);

      expect(summary).toContain('1234567VH5797S0001WX');
      expect(summary).toContain('Venta');
      expect(summary).toContain('Piso');
      expect(summary).toContain('320.000 €');
      expect(summary).toContain('Calle Mayor 10, Madrid');
    });
  });

  describe('formatOutcomeMessage', () => {
    it('returns collecting stage if not ready to confirm', () => {
      const msg = formatOutcomeMessage(false, false, 'Faltan datos', {}, labels);
      expect(msg).toBe('Faltan datos');
    });

    it('returns ask_photos stage if ready to confirm for the first time', () => {
      const msg = formatOutcomeMessage(true, false, 'Datos listos', {}, labels);
      expect(msg).toContain('Datos listos');
      expect(msg).toContain(labels.chat.askPhotosPrompt(10));
    });

    it('returns confirming stage if already was confirming', () => {
      const msg = formatOutcomeMessage(true, true, 'Confirmación', {}, labels);
      expect(msg).toContain('Confirmación');
      expect(msg).toContain(labels.chat.confirmDataPrompt(''));
    });
  });

  describe('generateMessageId', () => {
    it('generates unique IDs with the given prefix', () => {
      const id1 = generateMessageId('user');
      const id2 = generateMessageId('user');
      expect(id1.startsWith('user-')).toBe(true);
      expect(id1).not.toBe(id2);
    });
  });

  describe('buildDraftPreviewProperty', () => {
    it('constructs a Property entity from a draft', () => {
      const draft: PropertyDraft = {
        title: 'Ático céntrico',
        property_type: 'Apartment',
        price: 450000,
        bedrooms: 3,
        bathrooms: 2,
        square_meters: 110,
        city: 'Madrid',
        address: 'Gran Vía 1',
      };
      const property = buildDraftPreviewProperty(draft);

      expect(property.id).toBe('draft-preview');
      expect(property.title).toBe('Ático céntrico');
      expect(property.status).toBe('Available');
      expect(property.price).toBe(450000);
    });
  });

  describe('buildPropertyRouteParams', () => {
    it('builds string params for router navigation', () => {
      const property: Property = {
        id: 'prop-1',
        title: 'Chalet',
        property_type: 'Single Family',
        price: 600000,
        bedrooms: 4,
        bathrooms: 3,
        square_meters: 250,
        city: 'Madrid',
        address: 'Calle Roble',
        image_url: 'https://example.com/img.jpg',
        images: ['https://example.com/img.jpg'],
        amenities: [],
        status: 'Available',
      };
      const params = buildPropertyRouteParams(property);

      expect(params.id).toBe('prop-1');
      expect(params.price).toBe('600000');
      expect(params.images).toBe(JSON.stringify(['https://example.com/img.jpg']));
    });
  });

  describe('buildInitialMessages', () => {
    it('creates initial assistant greeting message', () => {
      const msgs = buildInitialMessages(labels);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].sender).toBe('assistant');
      expect(msgs[0].title).toBe(labels.chat.welcomeTitle);
    });
  });
});
