export type SearchExpectation =
  | { kind: 'topIncludes'; within: number; titles: string[] }
  | { kind: 'first'; title: string }
  | { kind: 'topHaveAmenity'; within: number; amenity: string }
  | { kind: 'empty' }
  | { kind: 'minCount'; count: number };

export interface SearchEvalCase {
  query: string;
  expect: SearchExpectation;
}

export const SEARCH_EVAL_CASES: SearchEvalCase[] = [
  { query: 'con pileta', expect: { kind: 'topHaveAmenity', within: 3, amenity: 'piscina' } },
  {
    query: 'algo en Guataparo',
    expect: {
      kind: 'topIncludes',
      within: 3,
      titles: ['Quinta con piscina en Guataparo', 'Townhouse de 4 habitaciones en Guataparo', 'Casa en alquiler en Altos de Guataparo'],
    },
  },
  {
    query: 'con zona de juegos para niños',
    expect: {
      kind: 'topIncludes',
      within: 3,
      titles: ['Apartamento familiar en alquiler en La Trigaleña', 'Townhouse de dos niveles en Trigal Norte'],
    },
  },
  { query: 'con vista a la montaña', expect: { kind: 'topHaveAmenity', within: 3, amenity: 'vista a la montaña' } },
  { query: 'la casa más barata con jardín', expect: { kind: 'first', title: 'Casa en alquiler en El Bosque' } },
  { query: 'La casa más barata con parrillera', expect: { kind: 'topHaveAmenity', within: 1, amenity: 'barbacoa' } },
  { query: 'castillo medieval con foso', expect: { kind: 'empty' } },
  { query: 'pisos en Valencia', expect: { kind: 'minCount', count: 9 } },
  { query: 'casas de 3 habitaciones', expect: { kind: 'minCount', count: 4 } },
  {
    query: 'algo en la Trigaleña',
    expect: {
      kind: 'topIncludes',
      within: 2,
      titles: ['Apartamento en alquiler en La Trigaleña', 'Apartamento familiar en alquiler en La Trigaleña'],
    },
  },
  { query: 'que tenga planta eléctrica', expect: { kind: 'topHaveAmenity', within: 3, amenity: 'planta eléctrica' } },
  { query: 'con parrillera', expect: { kind: 'topHaveAmenity', within: 3, amenity: 'barbacoa' } },
  { query: 'urbanización cerrada con vigilancia', expect: { kind: 'topHaveAmenity', within: 3, amenity: 'seguridad' } },
  {
    query: 'apartamento con gimnasio',
    expect: { kind: 'topIncludes', within: 2, titles: ['Apartamento en piso alto en Kerdell', 'Penthouse con terraza en El Parral'] },
  },
  { query: 'amoblado listo para mudarse', expect: { kind: 'topHaveAmenity', within: 2, amenity: 'amoblado' } },
  { query: 'para trabajar desde casa con buena señal de internet satelital en la playa', expect: { kind: 'empty' } },
];
