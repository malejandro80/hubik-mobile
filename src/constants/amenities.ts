export const AMENITY_KEYWORDS: [RegExp, string][] = [
  [/\bpiscinas?\b|\bpools?\b|\balbercas?\b/i, 'piscina'],
  [/\bgarajes?\b|\bgarages?\b|\bparqueaderos?\b|\bestacionamientos?\b/i, 'garaje'],
  [/\bparrilleras?\b|\bparrillas?\b|\bbarbacoas?\b|\bbbq\b|\bbarbecues?\b/i, 'barbacoa'],
  [/\bascensors?\b|\belevators?\b/i, 'ascensor'],
  [/\baire acondicionado\b|\bair conditioning\b|\ba\/c\b/i, 'aire acondicionado'],
  [/\bseguridad\b|\bvigilancia\b|\bsecurity\b/i, 'seguridad'],
  [/\bgimnasios?\b|\bgyms?\b/i, 'gimnasio'],
  [/\bterrazas?\b|\bbalc[oó]n(?:es)?\b|\bbalcon(?:y|ies)\b/i, 'terraza'],
  [/\bjard[ií]n(?:es)?\b|\bgardens?\b/i, 'jardín'],
];

export const AMENITY_SIGNAL_REGEX = /\b(tiene|cuenta con|incluye|cerca de|con vista a|hay|dispone de)\b/i;

export const MAX_AMENITY_LENGTH = 60;
export const MAX_AMENITIES = 20;
