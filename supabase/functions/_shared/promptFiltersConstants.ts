export const SQFT_TO_SQM_RATIO = 0.092903;

export const THOUSANDS_MULTIPLIER = 1000;

export const MAX_PRICE_REGEX =
  /(?:under|below|less than|<|max|menos de|menor a|hasta|máximo|maximo|bajo|debajo de)\s*\$?(\d+(?:k|,\d{3}|\.000)?)\b(?!\s*(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft|bed|br|hab|dorm|cuart|recám))/i;

export const MIN_PRICE_REGEX =
  /(?:above|over|more than|>|min|más de|mas de|mayor a|desde|mínimo|minimo|sobre|arriba de)\s*\$?(\d+(?:k|,\d{3}|\.000)?)\b(?!\s*(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft|bed|br|hab|dorm|cuart|recám))/i;

export const BEDROOMS_REGEX =
  /(\d+)\s*(?:-| )?(?:bed|bedroom|br|habitación|habitaciones|hab|dormitorio|dormitorios|cuarto|cuartos|recámara|recámaras)/i;

export const MAX_AREA_REGEX =
  /(?:less than|less|under|below|<|max|menos de|menor a|hasta|máximo|maximo|debajo de)\s*(\d+)\s*(?:square meters|square metres|metros cuadrados|metros|m2|m²|sqm|sq m|square feet|square feets|sqft|sq ft|sq\.ft)?/i;

export const MIN_AREA_REGEX =
  /(?:more than|over|above|>|min|más de|mas de|mayor a|desde|mínimo|minimo|arriba de)\s*(\d+)\s*(?:square meters|square metres|metros cuadrados|metros|m2|m²|sqm|sq m|square feet|square feets|sqft|sq ft|sq\.ft)?/i;

export const AREA_SIGNAL_REGEX = /(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft)/i;

export const SQFT_SIGNAL_REGEX = /(?:sqft|sq\s*ft|square feet|feet)/i;

export const LIMIT_REGEX =
  /(?:give|show|find|list|top|dame|muestra|mostrar|busca|buscar|encuentra|primeras|primeros)\s*(?:me\s*|las\s*|los\s*)?(\d+)/i;

export const SORT_CHEAPEST_REGEX =
  /(?:cheapest|lowest price|más barato|mas barato|más barata|mas barata|más económico|mas economico|más económica|mas economica|menor precio)/i;

export const SORT_EXPENSIVE_REGEX =
  /(?:most expensive|highest price|luxury|más caro|mas caro|más cara|mas cara|más costoso|mas costoso|más costosa|mas costosa|mayor precio|lujo|lujoso|lujosa)/i;

export const PROPERTY_TYPE_KEYWORDS = [
  ['Apartment', ['apartamento', 'departamento', 'piso', 'flat', 'apartment']],
  ['Condo', ['condominio', 'condo']],
  ['Townhouse', ['adosada', 'townhouse', 'townhome']],
  ['Studio', ['estudio', 'monoambiente', 'studio']],
  ['Single Family', ['casa', 'vivienda', 'chalet', 'house', 'home', 'single family']],
] as const;
