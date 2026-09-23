import { CATASTRO_LAST_VARIANTS as EDGE_VARIANTS } from '../../../supabase/functions/_shared/intakeMessageConstants';
import { CATASTRO_LAST_VARIANTS as APP_VARIANTS } from '../intakeMessages';

const COUNTRY_SPECIFIC = /\bIBI\b|Sede Electr[oó]nica|\bCatastro\b/;

describe.each([
  ['app fallback', APP_VARIANTS],
  ['edge function', EDGE_VARIANTS],
])('catastro request (%s)', (_source, variants) => {
  it.each(variants.map((variant) => [variant]))('stays country-neutral: %s', (variant) => {
    expect(variant).not.toMatch(COUNTRY_SPECIFIC);
    expect(variant.toLowerCase()).toContain('catastral');
  });
});

describe('catastro request copies', () => {
  it('match between the app fallback and the edge function', () => {
    expect(APP_VARIANTS).toEqual(EDGE_VARIANTS);
  });
});
