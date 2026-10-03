import { buildOpaqueAppLink } from '../appLink';
import { buildOpaqueShareUrl, buildShareUrl, isShareToken } from '../shareLink';

const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';

describe('isShareToken', () => {
  it('accepts a 32 character lowercase hex token', () => {
    expect(isShareToken(TOKEN)).toBe(true);
  });

  it.each(['', TOKEN.toUpperCase(), `${TOKEN}0`, TOKEN.slice(1), '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55', '../etc/passwd'])(
    'rejects %p',
    (value) => {
      expect(isShareToken(value)).toBe(false);
    }
  );

  it('rejects anything that is not a string', () => {
    expect(isShareToken(undefined)).toBe(false);
    expect(isShareToken(42)).toBe(false);
  });
});

describe('buildOpaqueShareUrl', () => {
  it('builds a link under /s that only contains the token', () => {
    expect(buildOpaqueShareUrl(TOKEN, 'https://hubik.example.app/')).toBe(`https://hubik.example.app/s/${TOKEN}`);
  });

  it('gives nothing without an https base or with an invalid token', () => {
    expect(buildOpaqueShareUrl(TOKEN, '')).toBeNull();
    expect(buildOpaqueShareUrl(TOKEN, 'http://hubik.example.app')).toBeNull();
    expect(buildOpaqueShareUrl('nope', 'https://hubik.example.app')).toBeNull();
  });

  it('can never be turned into a regular listing link, because the token is not a listing id', () => {
    expect(buildShareUrl({ id: TOKEN, title: 'Casa' }, 'https://hubik.example.app')).toBeNull();
  });
});

describe('buildOpaqueAppLink', () => {
  it('opens the token route in the app scheme', () => {
    expect(buildOpaqueAppLink(TOKEN)).toBe(`hubikmobile://s/${TOKEN}`);
  });

  it('gives nothing for an invalid token', () => {
    expect(buildOpaqueAppLink('x')).toBeNull();
  });
});
