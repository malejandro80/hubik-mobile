export type GridItem =
  | { type: 'photo'; uri: string; index: number }
  | { type: 'add' };

export function buildPhotoGridData(images: string[], maxImages: number): GridItem[] {
  const photoItems: GridItem[] = images.map((uri, index) => ({ type: 'photo', uri, index }));
  return images.length < maxImages ? [...photoItems, { type: 'add' }] : photoItems;
}
