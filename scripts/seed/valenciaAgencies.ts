export type SeedRole = 'owner' | 'agent';

export interface SeedAgency {
  id: string;
  name: string;
}

export interface SeedAgent {
  key: string;
  email: string;
  displayName: string;
  role: SeedRole;
  agencyId: string;
}

export const HUBIK_AGENCY_ID = '00000000-0000-0000-0000-000000000001';
export const CASA_NORTE_AGENCY_ID = '5a77e471-8d54-4947-9c64-4be12a8755bc';
export const VALENCIA_HOGAR_AGENCY_ID = 'a1c3e5f7-0001-4000-8000-000000000001';
export const GUATAPARO_AGENCY_ID = 'a1c3e5f7-0002-4000-8000-000000000002';
export const TRIGAL_AGENCY_ID = 'a1c3e5f7-0003-4000-8000-000000000003';

export const SEED_AGENCIES: SeedAgency[] = [
  { id: VALENCIA_HOGAR_AGENCY_ID, name: 'Valencia Hogar Inmobiliaria' },
  { id: GUATAPARO_AGENCY_ID, name: 'Guataparo Bienes Raíces' },
  { id: TRIGAL_AGENCY_ID, name: 'Inmobiliaria El Trigal' },
];

export const SEED_AGENTS: SeedAgent[] = [
  {
    key: 'carolina',
    email: 'carolina.mendez@example.com',
    displayName: 'Carolina Méndez',
    role: 'owner',
    agencyId: VALENCIA_HOGAR_AGENCY_ID,
  },
  {
    key: 'luis',
    email: 'luis.rodriguez@example.com',
    displayName: 'Luis Rodríguez',
    role: 'agent',
    agencyId: VALENCIA_HOGAR_AGENCY_ID,
  },
  {
    key: 'andres',
    email: 'andres.salazar@example.com',
    displayName: 'Andrés Salazar',
    role: 'owner',
    agencyId: GUATAPARO_AGENCY_ID,
  },
  {
    key: 'mariafernanda',
    email: 'mariafernanda.perez@example.com',
    displayName: 'María Fernanda Pérez',
    role: 'agent',
    agencyId: GUATAPARO_AGENCY_ID,
  },
  {
    key: 'daniela',
    email: 'daniela.rojas@example.com',
    displayName: 'Daniela Rojas',
    role: 'owner',
    agencyId: TRIGAL_AGENCY_ID,
  },
  {
    key: 'josegregorio',
    email: 'josegregorio.blanco@example.com',
    displayName: 'José Gregorio Blanco',
    role: 'agent',
    agencyId: TRIGAL_AGENCY_ID,
  },
  {
    key: 'valeria',
    email: 'valeria.torres@example.com',
    displayName: 'Valeria Torres',
    role: 'agent',
    agencyId: HUBIK_AGENCY_ID,
  },
];

export const EXISTING_AGENTS: Record<string, { userId: string; agencyId: string }> = {
  miguel: { userId: '682bbe94-6ebb-48a4-a9a7-d2eb3369ed2c', agencyId: CASA_NORTE_AGENCY_ID },
  houseapp: { userId: '6fab2aa7-a31e-4120-9a8c-ee1cf666cb97', agencyId: CASA_NORTE_AGENCY_ID },
};
