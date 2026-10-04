import { buildAssistantMessage, pendingExtras } from '../intakeMessage';
import {
  CATASTRO_LAST_VARIANTS,
  CATASTRO_UNVERIFIED_PREFIX,
  CATASTRO_VERIFIED_PREFIX,
  DESCRIBE_INVITE_VARIANTS,
  READY_TO_CONFIRM_VARIANTS,
} from '../intakeMessageConstants';

const ALL_REQUIRED = [
  'catastro',
  'property_type',
  'operation_type',
  'price',
  'bedrooms',
  'bathrooms',
  'square_meters',
  'city',
  'address',
] as const;

const first = (variants: readonly string[]) => variants[0];

describe('buildAssistantMessage', () => {
  it('invites a free description when nothing is known yet, without asking for the catastro', () => {
    const message = buildAssistantMessage([...ALL_REQUIRED], undefined, first);
    expect(DESCRIBE_INVITE_VARIANTS).toContain(message);
    expect(message.toLowerCase()).not.toContain('catastral');
  });

  it('never asks for the catastro while other fields are missing', () => {
    const message = buildAssistantMessage(['catastro', 'price', 'city'], undefined, first);
    expect(message).toContain('precio y ciudad');
    expect(message.toLowerCase()).not.toContain('catastral');
  });

  it('asks for the catastro alone when it is the only missing field', () => {
    const message = buildAssistantMessage(['catastro'], undefined, first);
    expect(CATASTRO_LAST_VARIANTS).toContain(message);
    expect(message).toContain('referencia catastral');
  });

  it('lists several missing fields with commas and a final "y"', () => {
    const message = buildAssistantMessage(['price', 'bedrooms', 'city'], undefined, first);
    expect(message).toContain('precio, habitaciones y ciudad');
  });

  it('confirms when nothing is missing', () => {
    expect(READY_TO_CONFIRM_VARIANTS).toContain(buildAssistantMessage([], undefined, first));
  });

  it('prefixes the catastro verification result when one was just supplied', () => {
    expect(buildAssistantMessage(['price'], 'verified', first).startsWith(CATASTRO_VERIFIED_PREFIX)).toBe(true);
    expect(buildAssistantMessage([], 'unverified', first).startsWith(CATASTRO_UNVERIFIED_PREFIX)).toBe(true);
  });

  it('uses a random variant by default', () => {
    const message = buildAssistantMessage([...ALL_REQUIRED]);
    expect(DESCRIBE_INVITE_VARIANTS).toContain(message);
  });

  it('asks for the catastro without saying it is the last step while photos or the map pin are pending', () => {
    const message = buildAssistantMessage(['catastro'], undefined, first, ['photos', 'location']);
    expect(message).toContain('referencia catastral');
    expect(message).toContain('«no tengo catastro»');
    expect(message).toContain('fotos y la ubicación en el mapa');
    expect(message).not.toMatch(/para terminar|último dato|ya casi está/i);
  });

  it('mentions only what is still pending', () => {
    const message = buildAssistantMessage(['catastro'], undefined, first, ['location']);
    expect(message).toContain('la ubicación en el mapa');
    expect(message).not.toContain('fotos');
  });

  it('says the listing can be published but recommends the pending extras once the data is complete', () => {
    const message = buildAssistantMessage([], undefined, first, ['photos']);
    expect(READY_TO_CONFIRM_VARIANTS).not.toContain(message);
    expect(message).toContain('publicar');
    expect(message).toContain('fotos');
    expect(message).not.toContain('ubicación');
  });

  it('keeps the catastro verification prefix in front of the pending-extras message', () => {
    expect(buildAssistantMessage([], 'verified', first, ['photos']).startsWith(CATASTRO_VERIFIED_PREFIX)).toBe(true);
  });

  it('does not append extras while other required fields are still missing', () => {
    expect(buildAssistantMessage(['price'], undefined, first, ['photos', 'location'])).not.toContain('fotos');
  });
});

describe('pendingExtras', () => {
  it('lists photos and the map pin when neither is set', () => {
    expect(pendingExtras({})).toEqual(['photos', 'location']);
    expect(pendingExtras({ images: [] })).toEqual(['photos', 'location']);
  });

  it('drops what is already done', () => {
    expect(pendingExtras({ images: ['file://a.jpg'] })).toEqual(['location']);
    expect(pendingExtras({ latitude: 10.2, longitude: -68 })).toEqual(['photos']);
    expect(pendingExtras({ images: ['file://a.jpg'], latitude: 10.2, longitude: -68 })).toEqual([]);
  });
});
