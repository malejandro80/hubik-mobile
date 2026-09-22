import { buildShareUrl, isPropertyId } from '../shareLink';

const ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';

describe('isPropertyId', () => {
  it('accepts a UUID in any case', () => {
    expect(isPropertyId(ID)).toBe(true);
    expect(isPropertyId(ID.toUpperCase())).toBe(true);
  });

  it.each(['', 'draft-preview', '123', `${ID}x`, ` ${ID}`, '../etc/passwd', 'a'.repeat(200)])(
    'rejects %p',
    (value) => {
      expect(isPropertyId(value)).toBe(false);
    }
  );

  it('rejects anything that is not a string', () => {
    expect(isPropertyId(undefined)).toBe(false);
    expect(isPropertyId(null)).toBe(false);
    expect(isPropertyId(42)).toBe(false);
  });
});

describe('buildShareUrl', () => {
  const LISTING = { id: ID, title: 'Piso en venta en Madrid' };

  it('builds a readable slug URL under /p', () => {
    expect(buildShareUrl(LISTING, 'https://hubik.example.app')).toBe(
      'https://hubik.example.app/p/piso-en-venta-en-madrid-3f2b1c9e'
    );
  });

  it('ignores trailing slashes and surrounding spaces in the base URL', () => {
    expect(buildShareUrl(LISTING, ' https://hubik.example.app/// ')).toBe(
      'https://hubik.example.app/p/piso-en-venta-en-madrid-3f2b1c9e'
    );
  });

  it('keeps a base path', () => {
    expect(buildShareUrl(LISTING, 'https://example.com/hubik/')).toBe(
      'https://example.com/hubik/p/piso-en-venta-en-madrid-3f2b1c9e'
    );
  });

  it('strips accents and symbols from the title', () => {
    expect(buildShareUrl({ id: ID, title: 'Ático en Peñíscola!' }, 'https://h.app')).toBe(
      'https://h.app/p/atico-en-peniscola-3f2b1c9e'
    );
  });

  it('gives no link when there is no base URL', () => {
    expect(buildShareUrl(LISTING, '')).toBeNull();
    expect(buildShareUrl(LISTING, '   ')).toBeNull();
  });

  it('only builds https links', () => {
    expect(buildShareUrl(LISTING, 'http://hubik.example.app')).toBeNull();
    expect(buildShareUrl(LISTING, 'javascript:alert(1)')).toBeNull();
    expect(buildShareUrl(LISTING, 'hubik.example.app')).toBeNull();
  });

  it('gives no link for an id that is not a listing id, such as a draft preview', () => {
    expect(buildShareUrl({ id: 'draft-preview', title: 'Borrador' }, 'https://hubik.example.app')).toBeNull();
    expect(buildShareUrl({ id: '', title: 'x' }, 'https://hubik.example.app')).toBeNull();
  });
});
