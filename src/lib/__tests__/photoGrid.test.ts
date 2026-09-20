import { buildPhotoGridData } from '../photoGrid';

describe('photoGrid library', () => {
  it('returns only an add tile when images array is empty and below max', () => {
    const data = buildPhotoGridData([], 5);
    expect(data).toEqual([{ type: 'add' }]);
  });

  it('appends an add tile when images count is below maxImages', () => {
    const images = ['file:///img1.jpg', 'file:///img2.jpg'];
    const data = buildPhotoGridData(images, 5);
    expect(data).toHaveLength(3);
    expect(data[0]).toEqual({ type: 'photo', uri: 'file:///img1.jpg', index: 0 });
    expect(data[1]).toEqual({ type: 'photo', uri: 'file:///img2.jpg', index: 1 });
    expect(data[2]).toEqual({ type: 'add' });
  });

  it('omits the add tile when images count equals or exceeds maxImages', () => {
    const images = ['1.jpg', '2.jpg', '3.jpg'];
    const data = buildPhotoGridData(images, 3);
    expect(data).toHaveLength(3);
    expect(data.every((item) => item.type === 'photo')).toBe(true);
  });
});
