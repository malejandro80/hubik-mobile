export const MIN_SIMILARITY = 0.65;

export const SIMILARITY_WINDOW = 0.05;

export const DEFAULT_MATCH_COUNT = 10;

export const PRICE_SORTS = ['price_asc', 'price_desc'] as const;

export const MIN_TERM_LENGTH = 3;

export const ACCENT_MARKS_PATTERN = /[\u0300-\u036f]/g;

export const NON_LETTER_PATTERN = /[^a-z]+/g;

export const GENERIC_SEARCH_WORDS = new Set([
  'algo', 'alguna', 'alguno', 'algunas', 'algunos', 'busco', 'buscar', 'busca', 'buscando', 'con', 'cual', 'del',
  'dame', 'donde', 'entre', 'esta', 'este', 'hay', 'las', 'los', 'mas', 'menos', 'muestra', 'muestrame', 'mostrar',
  'necesito', 'para', 'por', 'que', 'quiero', 'sea', 'sin', 'tenga', 'tengan', 'tiene', 'tienen', 'una', 'uno',
  'unos', 'unas', 'ver', 'desde', 'hasta', 'muy', 'otra', 'otro', 'favor', 'show', 'find', 'with', 'the',
  'barato', 'barata', 'baratos', 'baratas', 'caro', 'cara', 'caros', 'caras', 'economico', 'economica',
  'economicos', 'economicas', 'lujo', 'lujoso', 'lujosa', 'precio', 'precios', 'dolares', 'euros', 'usd', 'eur',
  'mil', 'millon', 'millones',
  'buen', 'buena', 'bueno', 'buenas', 'buenos', 'excelente', 'excelentes', 'mejor', 'mejores', 'lindo', 'linda',
  'bonito', 'bonita', 'bello', 'bella', 'perfecto', 'perfecta', 'ideal', 'zona', 'zonas',
  'casa', 'casas', 'piso', 'pisos', 'apartamento', 'apartamentos', 'departamento', 'departamentos', 'apto',
  'vivienda', 'viviendas', 'propiedad', 'propiedades', 'inmueble', 'inmuebles', 'estudio', 'estudios',
  'monoambiente', 'townhouse', 'townhouses', 'condominio', 'condominios', 'chalet', 'chalets', 'adosada',
  'venta', 'vender', 'compra', 'comprar', 'alquiler', 'alquilar', 'renta', 'rentar', 'arriendo',
  'habitacion', 'habitaciones', 'hab', 'cuarto', 'cuartos', 'dormitorio', 'dormitorios', 'recamara', 'recamaras',
  'bano', 'banos', 'metros', 'cuadrados',
]);
