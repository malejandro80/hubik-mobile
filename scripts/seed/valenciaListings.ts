export type SeedPropertyType = 'Apartment' | 'Single Family' | 'Townhouse' | 'Studio';
export type SeedOperation = 'sale' | 'rent';

export interface SeedListing {
  agent: string;
  type: SeedPropertyType;
  operation: SeedOperation;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareMeters: number;
  sector: string;
  street: string;
  latitude: number;
  longitude: number;
  title: string;
  amenities: string[];
  description: string;
}

export const SEED_CITY = 'Valencia';

export const SEED_LISTINGS: SeedListing[] = [
  {
    agent: 'carolina', type: 'Apartment', operation: 'sale', price: 68000, bedrooms: 3, bathrooms: 2, squareMeters: 98,
    sector: 'El Parral', street: 'Av. Principal de El Parral, Res. Parque Mirador, Torre B', latitude: 10.219, longitude: -68.008,
    title: 'Apartamento de 3 habitaciones en El Parral',
    amenities: ['piscina', 'ascensor', 'seguridad', 'planta eléctrica', 'garaje'],
    description: 'Amplio apartamento de 3 habitaciones y 2 baños, con salón luminoso y cocina empotrada. El conjunto ofrece piscina, ascensor, vigilancia y planta eléctrica, ideal para una familia que busca comodidad en el norte de Valencia.',
  },
  {
    agent: 'luis', type: 'Apartment', operation: 'rent', price: 450, bedrooms: 2, bathrooms: 2, squareMeters: 75,
    sector: 'La Trigaleña', street: 'Calle 137, Res. Los Samanes', latitude: 10.226, longitude: -68.018,
    title: 'Apartamento en alquiler en La Trigaleña',
    amenities: ['aire acondicionado', 'garaje', 'seguridad', 'tanque de agua'],
    description: 'Apartamento de 2 habitaciones y 2 baños, con aire acondicionado y puesto de estacionamiento. Residencia con vigilancia y tanque de agua, en una zona tranquila y bien conectada.',
  },
  {
    agent: 'andres', type: 'Single Family', operation: 'sale', price: 285000, bedrooms: 4, bathrooms: 4, squareMeters: 420,
    sector: 'Guataparo', street: 'Calle Los Cedros, Qta. Mi Refugio', latitude: 10.217, longitude: -68.047,
    title: 'Quinta con piscina en Guataparo',
    amenities: ['piscina', 'jardín', 'barbacoa', 'pozo de agua', 'planta eléctrica', 'vista a la montaña'],
    description: 'Quinta de 4 habitaciones y 4 baños sobre 420 m², con piscina, amplio jardín y área de parrillera. Cuenta con pozo de agua y planta eléctrica, rodeada de verde y con vista a la montaña.',
  },
  {
    agent: 'mariafernanda', type: 'Single Family', operation: 'rent', price: 1200, bedrooms: 4, bathrooms: 3, squareMeters: 300,
    sector: 'Altos de Guataparo', street: 'Calle El Mirador, Casa 12', latitude: 10.224, longitude: -68.041,
    title: 'Casa en alquiler en Altos de Guataparo',
    amenities: ['seguridad', 'jardín', 'terraza', 'garaje', 'amoblado'],
    description: 'Casa amoblada de 4 habitaciones y 3 baños en urbanización cerrada con vigilancia. Tiene terraza, jardín y estacionamiento techado para dos vehículos.',
  },
  {
    agent: 'daniela', type: 'Townhouse', operation: 'sale', price: 115000, bedrooms: 3, bathrooms: 3, squareMeters: 180,
    sector: 'Trigal Norte', street: 'Av. Carabobo, Conj. Villas del Trigal, TH 8', latitude: 10.2215, longitude: -68.003,
    title: 'Townhouse de dos niveles en Trigal Norte',
    amenities: ['piscina', 'parque infantil', 'seguridad', 'garaje'],
    description: 'Townhouse de dos niveles con 3 habitaciones y 3 baños. El conjunto cerrado cuenta con piscina, parque infantil y vigilancia, perfecto para familias con niños.',
  },
  {
    agent: 'josegregorio', type: 'Apartment', operation: 'rent', price: 380, bedrooms: 2, bathrooms: 1, squareMeters: 68,
    sector: 'Prebo', street: 'Av. Bolívar Norte, Res. Prebo Plaza, Piso 6', latitude: 10.2075, longitude: -68.0165,
    title: 'Apartamento céntrico en alquiler en Prebo',
    amenities: ['ascensor', 'cerca de centros comerciales', 'tanque de agua'],
    description: 'Apartamento práctico de 2 habitaciones y 1 baño, con ascensor y tanque de agua. Excelente ubicación cerca de centros comerciales, bancos y transporte.',
  },
  {
    agent: 'valeria', type: 'Studio', operation: 'rent', price: 280, bedrooms: 1, bathrooms: 1, squareMeters: 42,
    sector: 'El Viñedo', street: 'Calle 148, Edif. Viñedo Suites', latitude: 10.2095, longitude: -68.006,
    title: 'Estudio amoblado en El Viñedo',
    amenities: ['amoblado', 'aire acondicionado', 'seguridad'],
    description: 'Estudio amoblado y con aire acondicionado, listo para mudarse. Edificio con vigilancia, ideal para profesionales o estudiantes.',
  },
  {
    agent: 'miguel', type: 'Apartment', operation: 'sale', price: 52000, bedrooms: 2, bathrooms: 2, squareMeters: 82,
    sector: 'Los Mangos', street: 'Calle Cuadrada, Res. Los Mangos Country', latitude: 10.2025, longitude: -68.0115,
    title: 'Apartamento de 2 habitaciones en Los Mangos',
    amenities: ['piscina', 'garaje', 'seguridad', 'maletero'],
    description: 'Apartamento de 2 habitaciones y 2 baños con maletero y puesto de estacionamiento. La residencia ofrece piscina y vigilancia, en una zona residencial consolidada.',
  },
  {
    agent: 'houseapp', type: 'Single Family', operation: 'sale', price: 165000, bedrooms: 4, bathrooms: 3, squareMeters: 280,
    sector: 'La Viña', street: 'Calle Mérida, Qta. Las Acacias', latitude: 10.204, longitude: -68.0035,
    title: 'Quinta familiar en La Viña',
    amenities: ['jardín', 'barbacoa', 'garaje', 'cerco eléctrico', 'tanque de agua'],
    description: 'Quinta de 4 habitaciones y 3 baños con jardín, área de parrillera y garaje para tres vehículos. Protegida con cerco eléctrico y con tanque de agua, en una de las zonas más tradicionales de Valencia.',
  },
  {
    agent: 'carolina', type: 'Single Family', operation: 'rent', price: 850, bedrooms: 3, bathrooms: 2, squareMeters: 220,
    sector: 'El Bosque', street: 'Av. Andrés Eloy Blanco, Casa 45', latitude: 10.2005, longitude: -68.001,
    title: 'Casa en alquiler en El Bosque',
    amenities: ['jardín', 'garaje', 'aire acondicionado', 'planta eléctrica'],
    description: 'Casa de 3 habitaciones y 2 baños con jardín y garaje. Tiene aire acondicionado en las habitaciones y planta eléctrica, en una calle arbolada y tranquila.',
  },
  {
    agent: 'luis', type: 'Townhouse', operation: 'rent', price: 700, bedrooms: 3, bathrooms: 2, squareMeters: 160,
    sector: 'Valles de Camoruco', street: 'Calle Paseo Camoruco, Conj. Las Palmas, TH 3', latitude: 10.199, longitude: -67.995,
    title: 'Townhouse en alquiler en Valles de Camoruco',
    amenities: ['piscina', 'seguridad', 'terraza', 'garaje'],
    description: 'Townhouse de 3 habitaciones y 2 baños con terraza. Conjunto cerrado con piscina y vigilancia, cerca de colegios y comercios.',
  },
  {
    agent: 'andres', type: 'Apartment', operation: 'sale', price: 95000, bedrooms: 3, bathrooms: 2, squareMeters: 120,
    sector: 'Kerdell', street: 'Av. Cuatricentenaria, Res. Torre Kerdell, Piso 10', latitude: 10.209, longitude: -68.012,
    title: 'Apartamento en piso alto en Kerdell',
    amenities: ['ascensor', 'gimnasio', 'piscina', 'vista a la montaña', 'garaje'],
    description: 'Apartamento en piso alto con 3 habitaciones, 2 baños y vista a la montaña. El edificio cuenta con gimnasio, piscina, ascensores y dos puestos de estacionamiento.',
  },
  {
    agent: 'mariafernanda', type: 'Studio', operation: 'sale', price: 32000, bedrooms: 1, bathrooms: 1, squareMeters: 45,
    sector: 'Prebo', street: 'Av. 104, Res. Prebo Studios', latitude: 10.206, longitude: -68.018,
    title: 'Estudio en venta en Prebo',
    amenities: ['ascensor', 'seguridad', 'cocina empotrada'],
    description: 'Estudio moderno con cocina empotrada, en edificio con ascensor y vigilancia. Una buena opción de inversión para alquiler.',
  },
  {
    agent: 'daniela', type: 'Apartment', operation: 'rent', price: 520, bedrooms: 3, bathrooms: 2, squareMeters: 105,
    sector: 'La Trigaleña', street: 'Av. Salvador Feo La Cruz, Res. Trigaleña Suites', latitude: 10.2275, longitude: -68.015,
    title: 'Apartamento familiar en alquiler en La Trigaleña',
    amenities: ['piscina', 'parque infantil', 'planta eléctrica', 'garaje'],
    description: 'Apartamento de 3 habitaciones y 2 baños con buena ventilación. La residencia cuenta con piscina, parque infantil y planta eléctrica.',
  },
  {
    agent: 'josegregorio', type: 'Single Family', operation: 'sale', price: 98000, bedrooms: 3, bathrooms: 2, squareMeters: 200,
    sector: 'Las Chimeneas', street: 'Calle 3, Casa 27', latitude: 10.1935, longitude: -68.024,
    title: 'Casa en venta en Las Chimeneas',
    amenities: ['jardín', 'garaje', 'tanque de agua', 'cerco eléctrico'],
    description: 'Casa de 3 habitaciones y 2 baños con jardín y garaje para dos vehículos. Cuenta con tanque de agua y cerco eléctrico, en una urbanización consolidada.',
  },
  {
    agent: 'valeria', type: 'Apartment', operation: 'sale', price: 74000, bedrooms: 3, bathrooms: 2, squareMeters: 110,
    sector: 'El Viñedo', street: 'Av. Monseñor Adams, Res. Viñedo Park', latitude: 10.211, longitude: -68.0045,
    title: 'Apartamento remodelado en El Viñedo',
    amenities: ['ascensor', 'cocina empotrada', 'seguridad', 'garaje'],
    description: 'Apartamento remodelado de 3 habitaciones y 2 baños con cocina empotrada nueva. Edificio con ascensor y vigilancia, a pocos pasos de restaurantes y comercios.',
  },
  {
    agent: 'miguel', type: 'Townhouse', operation: 'rent', price: 650, bedrooms: 3, bathrooms: 3, squareMeters: 170,
    sector: 'Sabana Larga', street: 'Calle 5, Conj. Sabana Country, TH 14', latitude: 10.212, longitude: -67.99,
    title: 'Townhouse en alquiler en Sabana Larga',
    amenities: ['piscina', 'seguridad', 'barbacoa', 'garaje'],
    description: 'Townhouse de 3 habitaciones y 3 baños en conjunto cerrado con piscina, área de parrillera y vigilancia.',
  },
  {
    agent: 'houseapp', type: 'Apartment', operation: 'rent', price: 350, bedrooms: 2, bathrooms: 2, squareMeters: 78,
    sector: 'Los Mangos', street: 'Av. 101, Res. Mangos Plaza', latitude: 10.201, longitude: -68.013,
    title: 'Apartamento en alquiler en Los Mangos',
    amenities: ['ascensor', 'garaje', 'tanque de agua'],
    description: 'Apartamento de 2 habitaciones y 2 baños con puesto de estacionamiento. Edificio con ascensor y tanque de agua, cerca de supermercados y transporte.',
  },
  {
    agent: 'carolina', type: 'Single Family', operation: 'sale', price: 58000, bedrooms: 3, bathrooms: 2, squareMeters: 160,
    sector: 'Lomas del Este', street: 'Calle 7, Casa 19', latitude: 10.1835, longitude: -67.9905,
    title: 'Casa en venta en Lomas del Este',
    amenities: ['garaje', 'jardín', 'tanque de agua'],
    description: 'Casa de 3 habitaciones y 2 baños con jardín y garaje techado. Buena relación precio-espacio en una zona residencial del este de la ciudad.',
  },
  {
    agent: 'luis', type: 'Single Family', operation: 'rent', price: 550, bedrooms: 3, bathrooms: 2, squareMeters: 180,
    sector: 'Los Colorados', street: 'Calle Páez, Casa 8', latitude: 10.1775, longitude: -68.0005,
    title: 'Casa en alquiler en Los Colorados',
    amenities: ['garaje', 'terraza', 'cerco eléctrico'],
    description: 'Casa de 3 habitaciones y 2 baños con terraza techada y garaje. Protegida con cerco eléctrico, cerca del centro de Valencia.',
  },
  {
    agent: 'andres', type: 'Townhouse', operation: 'sale', price: 142000, bedrooms: 4, bathrooms: 3, squareMeters: 210,
    sector: 'Guataparo', street: 'Vía Guataparo, Conj. Los Pinos, TH 5', latitude: 10.2185, longitude: -68.044,
    title: 'Townhouse de 4 habitaciones en Guataparo',
    amenities: ['piscina', 'jardín', 'seguridad', 'pozo de agua', 'vista a la montaña'],
    description: 'Townhouse de 4 habitaciones y 3 baños con jardín privado y vista a la montaña. El conjunto tiene piscina, pozo de agua y vigilancia las 24 horas.',
  },
  {
    agent: 'daniela', type: 'Apartment', operation: 'sale', price: 125000, bedrooms: 4, bathrooms: 3, squareMeters: 160,
    sector: 'El Parral', street: 'Calle 139, Res. Parral Plaza, PH', latitude: 10.22, longitude: -68.006,
    title: 'Penthouse con terraza en El Parral',
    amenities: ['terraza', 'ascensor', 'piscina', 'gimnasio', 'planta eléctrica', 'garaje'],
    description: 'Penthouse de 4 habitaciones y 3 baños con gran terraza panorámica. El edificio ofrece piscina, gimnasio, ascensor y planta eléctrica.',
  },
];
