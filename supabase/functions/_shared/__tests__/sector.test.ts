import { groundSector } from '../sector';

const source = {
  address: 'Calle 137, Res. Los Samanes, La Trigaleña',
  title: 'Apartamento amplio con balcón',
  city: 'Valencia',
};

describe('groundSector', () => {
  it('keeps a sector that appears in the address, ignoring case and accents', () => {
    expect(groundSector('La Trigaleña', source)).toBe('La Trigaleña');
    expect(groundSector('  la   trigalena ', source)).toBe('la trigalena');
  });

  it('keeps a sector that only appears in the title', () => {
    expect(groundSector('Prebo', { address: 'Av. Bolívar Norte, Piso 6', title: 'Apartamento en Prebo', city: 'Valencia' })).toBe(
      'Prebo'
    );
  });

  it('rejects a sector the agent never wrote', () => {
    expect(groundSector('El Viñedo', source)).toBeNull();
  });

  it('rejects the city itself, too short or too long values and non-strings', () => {
    expect(groundSector('Valencia', { ...source, address: 'Calle 1, Valencia' })).toBeNull();
    expect(groundSector('La', source)).toBeNull();
    expect(groundSector('x'.repeat(61), { address: 'x'.repeat(61) })).toBeNull();
    expect(groundSector(null, source)).toBeNull();
    expect(groundSector(42, source)).toBeNull();
  });

  it('returns null when there is no address or title to ground it in', () => {
    expect(groundSector('La Trigaleña', {})).toBeNull();
  });
});
