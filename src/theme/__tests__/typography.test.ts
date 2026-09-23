import { typography } from '../typography';

describe('typography', () => {
  it('exposes exactly the seven type roles', () => {
    expect(Object.keys(typography).sort()).toEqual(
      ['body', 'bodyStrong', 'caption', 'display', 'headline', 'label', 'title'].sort()
    );
  });

  it('sets body text at 16pt', () => {
    expect(typography.body.fontSize).toBe(16);
    expect(typography.bodyStrong.fontSize).toBe(16);
  });

  it('uses the serif family only for display and title', () => {
    const serifRoles = Object.entries(typography)
      .filter(([, style]) => style.fontFamily !== undefined)
      .map(([role]) => role)
      .sort();
    expect(serifRoles).toEqual(['display', 'title']);
  });

  it('uses at most three font weights and six distinct sizes', () => {
    const styles = Object.values(typography);
    expect(new Set(styles.map((style) => style.fontWeight)).size).toBeLessThanOrEqual(3);
    expect(new Set(styles.map((style) => style.fontSize)).size).toBeLessThanOrEqual(6);
  });
});
