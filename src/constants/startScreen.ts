import type { StartAudience } from '../lib/startActions';

export const START_SEARCH_QUERY = 'Muéstrame las propiedades disponibles';

export const SEARCH_EXAMPLES = [
  'Casas con jardín en Valencia',
  'Apartamentos en alquiler con piscina',
  'Algo en Guataparo',
  'La casa más barata con jardín',
];

export const INVENTORY_EXAMPLES = [
  'Apartamentos en venta en Valencia',
  'Casas en alquiler con jardín',
  'Propiedades con vista a la montaña',
  'Townhouses con piscina',
];

export const START_EXAMPLES_BY_AUDIENCE: Record<StartAudience, string[]> = {
  visitor: SEARCH_EXAMPLES,
  client: SEARCH_EXAMPLES,
  agent: INVENTORY_EXAMPLES,
  owner: INVENTORY_EXAMPLES,
};

export const START_ACTION_ICONS = {
  search: 'search-outline',
  sign_in: 'log-in-outline',
  register: 'add-circle-outline',
  my_agency: 'briefcase-outline',
  create_agency: 'business-outline',
} as const;
