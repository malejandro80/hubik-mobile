import { isSamePhotoSet, moveItem } from '../photoOrder';

describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('moves an item forward', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward', () => {
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves an item to either end', () => {
    expect(moveItem(list, 2, 0)).toEqual(['c', 'a', 'b', 'd']);
    expect(moveItem(list, 1, 3)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('returns an equal copy when nothing moves or an index is out of range', () => {
    expect(moveItem(list, 1, 1)).toEqual(list);
    expect(moveItem(list, -1, 2)).toEqual(list);
    expect(moveItem(list, 1, 9)).toEqual(list);
    expect(moveItem(list, 1, 1)).not.toBe(list);
  });

  it('does not change the original list', () => {
    moveItem(list, 0, 3);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('isSamePhotoSet', () => {
  it('accepts any reordering of the same photos', () => {
    expect(isSamePhotoSet(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true);
    expect(isSamePhotoSet([], [])).toBe(true);
  });

  it('rejects an added, removed or replaced photo', () => {
    expect(isSamePhotoSet(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
    expect(isSamePhotoSet(['a', 'b', 'c'], ['a', 'b'])).toBe(false);
    expect(isSamePhotoSet(['a', 'b'], ['a', 'x'])).toBe(false);
  });

  it('rejects a duplicated photo standing in for another', () => {
    expect(isSamePhotoSet(['a', 'b'], ['a', 'a'])).toBe(false);
  });
});
