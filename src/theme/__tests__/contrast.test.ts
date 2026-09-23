import { colors } from '../colors';
import { CONTRAST_PAIRS, contrastRatio } from '../contrast';

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('accepts shorthand hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5);
  });
});

describe.each(['light', 'dark'] as const)('%s theme contrast', (mode) => {
  it.each(CONTRAST_PAIRS.map((pair) => [`${pair.fg} on ${pair.bg}`, pair] as const))(
    '%s meets its WCAG AA minimum',
    (_name, { fg, bg, min }) => {
      const theme = colors[mode];
      expect(contrastRatio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(min);
    }
  );

  it('covers every text role against every base surface', () => {
    const covered = new Set(CONTRAST_PAIRS.map(({ fg, bg }) => `${fg}/${bg}`));
    for (const fg of ['text', 'textSecondary', 'textTertiary'] as const) {
      for (const bg of ['background', 'surface', 'surfaceMuted'] as const) {
        expect(covered.has(`${fg}/${bg}`)).toBe(true);
      }
    }
  });
});
