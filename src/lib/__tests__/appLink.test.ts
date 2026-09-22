import { buildAppLink } from '../appLink';

const ID = '6ff52f65-00be-4ee2-a304-302a60358d4e';

describe('buildAppLink', () => {
  it('opens the listing by its readable address in the app scheme', () => {
    expect(buildAppLink({ id: ID, title: 'Piso en venta en Madrid' })).toBe('hubikmobile://p/piso-en-venta-en-madrid-6ff52f65');
  });

  it('strips accents and symbols like the shared link does', () => {
    expect(buildAppLink({ id: ID, title: 'Ático en Peñíscola!' })).toBe('hubikmobile://p/atico-en-peniscola-6ff52f65');
  });

  it('gives nothing for an id that is not a listing id', () => {
    expect(buildAppLink({ id: 'draft-preview', title: 'Borrador' })).toBeNull();
    expect(buildAppLink({ id: '', title: 'x' })).toBeNull();
  });

  it('only ever contains the scheme and characters from a slug', () => {
    const link = buildAppLink({ id: ID, title: '"><script>alert(1)</script> ../../x' });

    expect(link).toMatch(/^hubikmobile:\/\/p\/[a-z0-9-]+$/);
  });
});
