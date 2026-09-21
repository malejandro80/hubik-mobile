import { buildAssistantMessage } from '../intakeMessage';
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
});
