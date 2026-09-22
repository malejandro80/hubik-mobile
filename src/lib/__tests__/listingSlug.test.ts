import { buildListingSlug, parseListingRef, slugify } from '../listingSlug';

const ID = '6ff52f65-00be-4ee2-a304-302a60358d4e';

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugify('Piso en venta en Madrid')).toBe('piso-en-venta-en-madrid');
  });

  it('removes accents and turns ñ into n', () => {
    expect(slugify('Ático con terraza en Peñíscola')).toBe('atico-con-terraza-en-peniscola');
  });

  it('drops symbols and emoji and collapses repeated separators', () => {
    expect(slugify('  ¡Chalet!!  -- 3 hab. & piscina 🏊  ')).toBe('chalet-3-hab-piscina');
  });

  it('caps the length at 60 characters without leaving a trailing hyphen', () => {
    const slug = slugify('casa '.repeat(30));

    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug.startsWith('casa-casa')).toBe(true);
  });

  it('falls back to a neutral word when nothing usable is left', () => {
    expect(slugify('')).toBe('propiedad');
    expect(slugify('🏠🏠🏠')).toBe('propiedad');
    expect(slugify('   ')).toBe('propiedad');
  });

  it('only ever produces lowercase letters, digits and hyphens', () => {
    expect(slugify('<script>alert("x")</script> ../../etc/passwd')).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('buildListingSlug', () => {
  it('ends with the first eight characters of the id', () => {
    expect(buildListingSlug('Piso en venta en Madrid', ID)).toBe('piso-en-venta-en-madrid-6ff52f65');
  });

  it('lowercases the id part', () => {
    expect(buildListingSlug('Casa', ID.toUpperCase())).toBe('casa-6ff52f65');
  });

  it('works for an empty title', () => {
    expect(buildListingSlug('', ID)).toBe('propiedad-6ff52f65');
  });
});

describe('parseListingRef', () => {
  it('recognises a full id', () => {
    expect(parseListingRef(ID)).toEqual({ kind: 'id', id: ID });
  });

  it('recognises a slug and extracts the short id', () => {
    expect(parseListingRef('piso-en-venta-en-madrid-6ff52f65')).toEqual({
      kind: 'slug',
      slug: 'piso-en-venta-en-madrid-6ff52f65',
      shortId: '6ff52f65',
    });
  });

  it('accepts a bare short id and mixed case', () => {
    expect(parseListingRef('6FF52F65')).toEqual({ kind: 'slug', slug: '6ff52f65', shortId: '6ff52f65' });
    expect(parseListingRef('Casa-6FF52F65')).toEqual({ kind: 'slug', slug: 'casa-6ff52f65', shortId: '6ff52f65' });
  });

  it('uses the last eight characters even when the title ends in digits', () => {
    expect(parseListingRef('casa-12345678-6ff52f65')).toEqual({
      kind: 'slug',
      slug: 'casa-12345678-6ff52f65',
      shortId: '6ff52f65',
    });
  });

  it.each([
    undefined,
    null,
    42,
    '',
    'piso-en-madrid',
    'piso-6ff52f6',
    'piso-6ff52f65x',
    'piso 6ff52f65',
    'piso/6ff52f65',
    '../6ff52f65',
    "piso-6ff52f65' or 1=1",
    'a'.repeat(200) + '-6ff52f65',
  ])('rejects %p', (value) => {
    expect(parseListingRef(value)).toBeNull();
  });
});
