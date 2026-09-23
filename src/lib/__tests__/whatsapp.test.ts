import { canContactAgents, normalizeWhatsApp, whatsAppUrl } from '../whatsapp';
import { Profile } from '../../types/auth';

const profile = (role: Profile['role']): Profile => ({ userId: 'u1', role, agencyId: null, displayName: null });

describe('normalizeWhatsApp', () => {
  it.each([
    ['+58 414-123 4567', '+584141234567'],
    ['+58 (414) 123.45.67', '+584141234567'],
    ['0058 414 1234567', '+584141234567'],
    ['  +34612345678  ', '+34612345678'],
  ])('turns %s into %s', (input, expected) => {
    expect(normalizeWhatsApp(input)).toBe(expected);
  });

  it.each(['0414 123', '4141234567', '+0414123456', '+58 414 abc 4567', '', '+5841412345678901'])(
    'rejects %s',
    (input) => {
      expect(normalizeWhatsApp(input)).toBeNull();
    }
  );
});

describe('whatsAppUrl', () => {
  it('opens a chat with the number and an encoded message', () => {
    expect(whatsAppUrl('+584141234567', 'Hola, me interesa «Casa» que vi en Hubik.')).toBe(
      'https://wa.me/584141234567?text=Hola%2C%20me%20interesa%20%C2%ABCasa%C2%BB%20que%20vi%20en%20Hubik.'
    );
  });
});

describe('canContactAgents', () => {
  it('lets visitors and clients contact agents, but not agents or owners', () => {
    expect(canContactAgents(null)).toBe(true);
    expect(canContactAgents(profile('client'))).toBe(true);
    expect(canContactAgents(profile('agent'))).toBe(false);
    expect(canContactAgents(profile('owner'))).toBe(false);
  });
});
