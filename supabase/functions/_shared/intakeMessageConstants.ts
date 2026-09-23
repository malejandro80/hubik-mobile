export const FIELD_LABELS = {
  catastro: 'referencia catastral',
  title: 'título',
  property_type: 'tipo de propiedad',
  operation_type: 'si es venta o alquiler',
  price: 'precio',
  bedrooms: 'habitaciones',
  bathrooms: 'baños',
  square_meters: 'metros cuadrados',
  city: 'ciudad',
  address: 'dirección',
} as const;

export const REQUIRED_FIELD_COUNT = 9;

export const CATASTRO_VERIFIED_PREFIX = '✅ Referencia catastral verificada: no está duplicada.\n\n';

export const CATASTRO_UNVERIFIED_PREFIX =
  'Referencia catastral registrada. La verificaré de nuevo antes de publicar.\n\n';

export const READY_TO_CONFIRM_VARIANTS = [
  '¡Perfecto! Ya tengo todos los datos necesarios. Aquí tiene el resumen para confirmar.',
  '¡Listo! Con esto ya completé todos los datos. Revise el resumen y confírmelo cuando guste.',
  'Excelente, ya reuní todo lo necesario. Eche un vistazo al resumen antes de publicar.',
];

export const MISSING_FIELDS_PREFIX_VARIANTS = ['Me falta: ', 'Aún necesito: ', 'Todavía me falta: '];

export const MISSING_FIELDS_SUFFIX_VARIANTS = [
  'Puede dármelos todos juntos o de a poco.',
  'Puede indicármelos todos de una vez o uno a la vez.',
  'Cuando guste, dígamelos juntos o por partes.',
];

export const DESCRIBE_INVITE_VARIANTS = [
  '¡Hola! Cuénteme la propiedad con sus propias palabras: tipo, si es venta o alquiler, precio, habitaciones, baños, metros y ubicación. También puede adjuntar fotos y marcar el mapa cuando quiera.',
  'Cuénteme de la propiedad como si se la describiera a un cliente. Puede escribirlo o enviar una nota de voz, y adjuntar las fotos y la ubicación en el mapa cuando quiera.',
  'Empecemos: describa la propiedad con sus palabras (tipo, precio, habitaciones, baños, metros y dónde está). Las fotos y el mapa los puede añadir en cualquier momento.',
];

export const CATASTRO_LAST_VARIANTS = [
  'Ya casi está. Solo me falta la referencia catastral de la propiedad, también llamada número catastral (aparece en la escritura o en el recibo del impuesto sobre la propiedad). La verificaré antes de publicar.',
  'Último dato: la referencia catastral de la propiedad. Suele figurar en la escritura, en el recibo del impuesto sobre la propiedad o en la oficina de catastro de su municipio. La verifico enseguida.',
  'Para terminar necesito la referencia catastral, el código que identifica el inmueble en la escritura o en el recibo del impuesto sobre la propiedad. La compruebo antes de publicar.',
];
