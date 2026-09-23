const UNSPLASH = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1000&q=80`;

const HOUSE_EXTERIORS = [
  '1560518883-ce09059eeffa',
  '1600585154340-be6161a56a0c',
  '1613977257363-707ba9348227',
  '1600596542815-ffad4c1539a9',
  '1512917774080-9991f1c4c750',
  '1613490493576-7fde63acd811',
];

const HOUSE_INTERIORS = [
  '1600607687939-ce8a6c25118c',
  '1600607687920-4e2a09cf159d',
  '1600566753190-17f0baa2a6c3',
  '1600585154526-990dced4db0d',
];

const APARTMENT_INTERIORS = [
  '1560448204-e02f11c3d0e2',
  '1522708323590-d24dbb6b0267',
  '1502672260266-1c1ef2d93688',
  '1502672023488-70e25813eb80',
  '1574362848149-11496d93a7c7',
  '1536376072261-38c75010e6c9',
  '1513694203232-719a280e022f',
];

const APARTMENT_EXTERIOR = '1545324418-cc1a3fa10c00';

export type PhotoSet = 'house' | 'apartment';

export function seedPhotos(set: PhotoSet, index: number): string[] {
  const ids =
    set === 'house'
      ? [
          HOUSE_EXTERIORS[index % HOUSE_EXTERIORS.length],
          HOUSE_INTERIORS[index % HOUSE_INTERIORS.length],
          HOUSE_INTERIORS[(index + 1) % HOUSE_INTERIORS.length],
        ]
      : [
          APARTMENT_INTERIORS[index % APARTMENT_INTERIORS.length],
          APARTMENT_INTERIORS[(index + 3) % APARTMENT_INTERIORS.length],
          APARTMENT_EXTERIOR,
        ];
  return ids.map(UNSPLASH);
}
