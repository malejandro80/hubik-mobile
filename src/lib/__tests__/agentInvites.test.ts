import { isAddAgentOutcome, isValidInviteEmail, normalizeInviteEmail } from '../agentInvites';

describe('normalizeInviteEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeInviteEmail('  New.Person@Example.TEST ')).toBe('new.person@example.test');
  });

  it('keeps an already clean email unchanged', () => {
    expect(normalizeInviteEmail('ana@correo.com')).toBe('ana@correo.com');
  });
});

describe('isValidInviteEmail', () => {
  it.each(['ana@correo.com', 'Ana.Perez+hubik@correo.co.uk', '  ana@correo.com  '])('accepts %s', (email) => {
    expect(isValidInviteEmail(email)).toBe(true);
  });

  it.each(['', '   ', 'plain', 'a@b', 'a b@c.de', '@correo.com', 'ana@.com', 'ana@@correo.com'])(
    'rejects "%s"',
    (email) => {
      expect(isValidInviteEmail(email)).toBe(false);
    }
  );

  it('rejects an address longer than 254 characters', () => {
    expect(isValidInviteEmail(`${'x'.repeat(250)}@example.test`)).toBe(false);
  });
});

describe('isAddAgentOutcome', () => {
  it('accepts only the four outcomes the server can return', () => {
    expect(isAddAgentOutcome('agent_added')).toBe(true);
    expect(isAddAgentOutcome('invited')).toBe(true);
    expect(isAddAgentOutcome('already_listed')).toBe(true);
    expect(isAddAgentOutcome('unavailable')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isAddAgentOutcome('ok')).toBe(false);
    expect(isAddAgentOutcome(null)).toBe(false);
    expect(isAddAgentOutcome(42)).toBe(false);
  });
});
