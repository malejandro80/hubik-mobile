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

export const READY_TO_CONFIRM_VARIANTS = [
  '¡Perfecto! Ya tengo todos los datos necesarios. Aquí tiene el resumen para confirmar.',
  '¡Listo! Con esto ya completé todos los datos. Revise el resumen y confírmelo cuando guste.',
  'Excelente, ya reuní todo lo necesario. Eche un vistazo al resumen antes de publicar.',
];

// Shown instead of READY_TO_CONFIRM_VARIANTS when every text field is complete but the draft
// still has neither a photo nor a map pin - avoids telling the user the listing is fully ready
// when it has no photo and no location.
export const READY_NEEDS_MEDIA_VARIANTS = [
  'Ya tengo todos los datos del formulario. Antes de publicar, añada al menos una foto o marque la ubicación en el mapa para que el anuncio se vea completo.',
  'Los datos ya están completos. Para terminar, agregue una foto o marque la ubicación en el mapa antes de publicar.',
  'Con esto el formulario ya está completo. Solo falta una foto o la ubicación en el mapa para dejarlo listo.',
];
