export const labels = {
  common: {
    hubik: 'Hubik',
    tagline: 'Hubik Real Estate AI',
    back: 'Regresar',
    menu: 'Menú de opciones',
    todayTime: 'Hoy, 10:30',
    understood: 'Entendido',
  },
  chat: {
    inputPlaceholder: 'Escriba su consulta aquí...',
    accessibilityInput: 'Campo de consulta inmobiliaria',
    stopRecordingA11y: 'Detener grabación de nota de voz',
    sendQueryA11y: 'Enviar consulta',
    micA11y: 'Hablar por micrófono',
    sendSrOnly: 'Enviar',
    assistantBadge: '🤖 Asistente Hubik',
    propertiesFound: (count: number) => `Propiedades Encontradas (${count}):`,
    justNow: 'Just now',
    voiceNote: '🎤 Nota de voz',
    welcomeTitle: 'Buenos días, Don Carlos.',
    welcomeMessage:
      '¿En qué puedo ayudarle hoy con sus propiedades o búsqueda de vivienda?\n\nPuede pulsar el **botón verde del micrófono** para hablar con tranquilidad, o escribir si lo prefiere.',
    welcomeTimestamp: '10:30',
    registerExample:
      'Para comenzar, indíqueme la referencia catastral de la propiedad (puede consultarla en el recibo del IBI o en la Sede Electrónica del Catastro). La verificaré para asegurarnos de que no esté ya registrada antes de seguir. Después de eso, puede describir el resto de la propiedad de una sola vez, por voz o por texto (tipo, precio, habitaciones, baños, metros, ciudad y dirección) — no hace falta ir dato por dato.',
    cancelRegistrationConfirmation:
      'De acuerdo, cancelé el registro. Puede volver a intentarlo cuando quiera.',
    publishedSuccess: (title: string) => `¡Listo! Publiqué "${title}" en Hubik.`,
    publishError: (err: string) =>
      `⚠️ No pude publicar la propiedad (${err}). Sus datos siguen guardados, puede intentar de nuevo.`,
    photosPrompt:
      '¿Desea agregar o cambiar las fotos de la propiedad? Diga "adjuntar fotos", o "continuar" para mantener las que tiene.',
    photosContinueLocationPrompt:
      'Perfecto. Ahora diga o escriba "fijar ubicación" o "abrir mapa" para marcar en el mapa dónde está la propiedad.',
    photosPermissionRequired:
      'Necesito permiso para acceder a sus fotos. Actívelo desde los ajustes del dispositivo para adjuntar imágenes, o diga "continuar sin fotos".',
    photosAdded: (added: number, total: number) =>
      `Añadí ${added} foto(s). Tiene ${total} en total (se subirán al publicar). Puede decir o escribir "continuar" para seguir con el registro, o agregar más fotos.`,
    photosNoneSelected:
      'No se seleccionó ninguna foto. Puede intentarlo de nuevo o decir "continuar sin fotos".',
    photosSelectionError: (err: string) =>
      `⚠️ No pude seleccionar esas fotos (${err}). Intente de nuevo.`,
    correctionPrompt: '¿Qué dato desea corregir? Cuéntemelo y lo actualizo.',
    confirmDataPrompt: (summary: string) =>
      `${summary}\n\n¿Los datos son correctos? Diga o escriba "confirmar" o "publicar" para publicarla, o indíqueme qué desea corregir.`,
    askPhotosPrompt: (max: number) =>
      `¿Desea agregar fotos de la propiedad? Puede decir "adjuntar fotos" (hasta ${max}), o decir "continuar sin fotos" para seguir adelante.`,
    processDataError: (err: string) =>
      `⚠️ No pude procesar esos datos (${err}). Intente nuevamente.`,
    serviceError: (err: string) =>
      `⚠️ No se pudo conectar con el servicio de IA (${err}). Por favor intenta nuevamente.`,
    voiceProcessError: (err: string) =>
      `⚠️ No pude procesar la nota de voz (${err}). Intenta grabar de nuevo o escribir tu mensaje.`,
    locationConfirmedNotice: (address: string) =>
      `📍 Ubicación confirmada: ${address}. Generando la descripción de la propiedad...`,
    previewSummary: (summary: string) =>
      `¡Listo! Aquí tiene la vista previa. Puede editar cualquier dato antes de publicar.\n\n${summary}\n\n¿Los datos son correctos? Diga o escriba "confirmar" o "publicar" para publicarla, o indíqueme qué desea corregir.`,
    descriptionGenError: (err: string) =>
      `⚠️ No pude generar la descripción (${err}). Diga o escriba "fijar ubicación" para intentar de nuevo.`,
    micNotAvailableTitle: 'Micrófono no disponible',
    micNotAvailableMessage:
      'No pudimos acceder al micrófono. Revisa los permisos de la app o escribe tu mensaje.',
    attachMorePhotos: 'Adjuntar más fotos',
  },
  propertyCard: {
    status: {
      available: 'Disponible',
      pending: 'Pendiente',
      sold: 'Vendido',
    },
    commission: ' · 3%',
    photosCount: (count: number) => `${count} fotos`,
    defaultPhotosCount: '14 fotos',
    exteriorElevator: ' · Exterior con ascensor',
    sqmLabel: (sqm: number | string) => `${sqm} metros cuadrados`,
    sqmSuffix: 'm²',
    studio: 'Estudio',
    bedroomShort: (count: number) => `${count} hab.`,
    bathrooms: (count: number) => (count === 1 ? '1 baño' : `${count} baños`),
    viewDetails: 'Ver detalle',
    share: 'Compartir',
    viewDetailsA11y: (title: string) => `Ver detalle de ${title}`,
    shareA11y: (title: string) => `Compartir ${title}`,
    shareMessage: (title: string, price: string, city: string, address: string) =>
      `Mira esta propiedad en Hubik: ${title} por ${price} en ${city}.\nDirección: ${address}`,
  },
  photoGrid: {
    add: 'Añadir',
    addA11y: 'Añadir más fotos',
    cover: 'Portada',
    removeA11y: (index: number) => `Eliminar foto ${index}`,
    moveBackA11y: (index: number) => `Mover foto ${index} hacia atrás`,
    moveForwardA11y: (index: number) => `Mover foto ${index} hacia adelante`,
  },
  mapPicker: {
    title: 'Fijar ubicación',
    closeA11y: 'Cerrar mapa',
    confirm: 'Confirmar ubicación',
    confirmA11y: 'Confirmar ubicación',
    loadingLocation: 'Detectando ubicación...',
  },
  livingDraft: {
    title: 'Ficha en progreso',
    sale: 'Venta',
    rent: 'Alquiler',
    bedroomShort: (count: number) => `${count} hab.`,
    bathrooms: (count: number) => `${count} baños`,
    sqmSuffix: (sqm: number | string) => `${sqm} m²`,
    completeFieldA11y: (fieldLabel: string) => `Completar ${fieldLabel}`,
    propertyTypeA11y: (option: string) => `Tipo de propiedad: ${option}`,
    operationTypeA11y: (option: string) => `Operación: ${option}`,
  },
  amenitiesConfirmation: {
    title: 'Comodidades detectadas',
    empty: 'Aún no detecté comodidades. Puede agregarlas abajo.',
    addPlaceholder: 'Agregar comodidad o característica...',
    addA11y: 'Agregar comodidad',
    removeA11y: (amenity: string) => `Quitar ${amenity}`,
  },
  burgerMenu: {
    brandTitle: 'Hubik',
    closeA11y: 'Cerrar menú lateral',
    backdropA11y: 'Cerrar menú',
    roleLabels: {
      client: 'Cliente',
      agent: 'Agente',
      owner: 'Propietario',
    },
    unnamedUser: 'Usuario',
    profileA11y: (name: string, role: string) => `${name}, ${role}`,
    guestTitle: 'Encuentra la propiedad de tus sueños',
    guestCta: 'Regístrate',
    guestA11y: 'Encuentra la propiedad de tus sueños. Regístrate o inicia sesión',
    version: 'Hubik Real Estate AI • v1.0',
    savedDraftsTitle: 'Propiedades Guardadas',
    savedDraftsMessage: 'Aún no ha guardado propiedades en sus favoritos.',
    settingsTitle: 'Ajustes',
    settingsMessage: 'Configuraciones de voz, lectura y accesibilidad para Don Carlos.',
    helpTitle: 'Ayuda y Soporte',
    helpMessage: 'Comuníquese con el equipo de soporte de Hubik o su asesor personal.',
    menuItems: {
      search: 'Buscar Propiedades',
      register: 'Registrar Vivienda',
      newChat: 'Reiniciar Chat',
      saved: 'Propiedades Guardadas',
      settings: 'Ajustes y Accesibilidad',
      help: 'Ayuda y Soporte',
      badgeNew: 'Nuevo',
      signIn: 'Iniciar sesión',
      signOut: 'Cerrar sesión',
      createAgency: 'Tengo una inmobiliaria',
      myAgency: 'Mi inmobiliaria',
    },
  },
  auth: {
    signInTitle: 'Bienvenido a Hubik',
    signInSubtitle:
      'Inicie sesión para publicar propiedades o crear su inmobiliaria. Para buscar propiedades no necesita cuenta.',
    continueWithGoogle: 'Continuar con Google',
    continueWithApple: 'Continuar con Apple',
    continueWithoutAccount: 'Seguir buscando sin cuenta',
    signingIn: 'Iniciando sesión...',
    signInError: (err: string) =>
      `No pudimos iniciar sesión (${err}). Inténtelo de nuevo.`,
    signOutErrorTitle: 'No se pudo cerrar la sesión',
    signOutErrorMessage: 'Compruebe su conexión e inténtelo de nuevo.',
    signInStartError: 'No se pudo iniciar el proceso de inicio de sesión.',
    signInMissingCodeError: 'El proveedor no devolvió un código de acceso válido.',
    agencyNameRequired: 'Escriba el nombre de la inmobiliaria (mínimo 2 letras).',
    createAgencyTitle: 'Cree su inmobiliaria',
    createAgencySubtitle:
      'Será el propietario de la inmobiliaria. Un miembro del equipo de Hubik asignará a sus agentes.',
    agencyNameLabel: 'Nombre de la inmobiliaria',
    agencyNamePlaceholder: 'Por ejemplo: Inmobiliaria Casa Norte',
    createAgencySubmit: 'Crear inmobiliaria',
    createAgencySubmitting: 'Creando...',
    createAgencyError: (err: string) =>
      `No pudimos crear la inmobiliaria (${err}). Inténtelo de nuevo.`,
    createAgencySuccess: 'Inmobiliaria creada.',
    signInRequiredForAgency: 'Inicie sesión para crear su inmobiliaria.',
    myAgencyTitle: 'Mi inmobiliaria',
    myAgencyEmpty: 'Sus agentes aún no han publicado propiedades.',
    myAgencyLoadError: 'No pudimos cargar las propiedades de su inmobiliaria.',
    retry: 'Reintentar',
    registerRequiresSignIn:
      'Para registrar una propiedad, inicie sesión con su cuenta de agente desde el menú.',
    registerRequiresAgent:
      'Solo los agentes de una inmobiliaria pueden registrar propiedades. Si es agente, pida a su inmobiliaria que le asigne.',
    listedBy: (agency: string, agent?: string | null) =>
      agent ? `${agency} · ${agent}` : agency,
    back: 'Regresar',
  },
  propertyDetail: {
    noAgencyFees: 'Sin honorarios de agencia',
    groundLevelElevator: ' · 2ª planta con ascensor cota cero',
    accessibilitySectionTitle: 'Características de Accesibilidad y Confort',
    descriptionSectionTitle: 'Descripción de la vivienda',
    nearbyAmenitiesSectionTitle: 'Cercanías a pie',
    contactAdvisor: 'Contactar asesor',
    contactAdvisorA11y: 'Contactar asesor de Hubik',
    contactAdvisorAlertTitle: 'Contactar asesor',
    contactAdvisorAlertMessage:
      'Conectando con su asesor personal de Hubik para coordinar una visita accesible.',
    quickQuestionSentTitle: 'Consulta enviada',
    quickQuestionSentMessage: (q: string) => `Su pregunta: "${q}" ha sido enviada al asistente.`,
    micAlertTitle: 'Micrófono Hubik',
    micAlertMessage: 'Hable con tranquilidad para consultar sobre esta vivienda.',
    errorGeneratingDescription: 'No se pudo generar la descripción en este momento.',
    photosCount: (current: number, total: number) => `1 de ${total} foto${total === 1 ? '' : 's'}`,
    noPhotos: 'Sin fotos',
    mockPhotosCount: '1 de 8 fotos',
    features: {
      directElevator: 'Ascensor directo',
      directElevatorSub: 'Sin escalón en portal',
      flatAccess: 'Acceso plano',
      flatAccessSub: 'Pasillos anchos (95cm)',
      adaptedBaths: (baths: string | number) => `${baths} Baños adaptados`,
      adaptedBathsSub: 'Ducha llana antideslizante',
      sunnySqm: (sqm: string | number) => `${sqm} m² soleados`,
      sunnySqmSub: 'Luz natural de mañana',
      bedroomsCount: (beds: string | number) => `${beds} Habitaciones`,
      bedroomsCountSub: 'Armarios empotrados',
      centralHeating: 'Calefacción central',
      centralHeatingSub: 'Excelente aislamiento',
    },
    amenities: {
      pharmacy: 'Farmacia 24 horas',
      pharmacyDist: 'A 80 metros',
      supermarket: 'Supermercado tradicional',
      supermarketDist: 'A 120 metros',
      busLines: 'Líneas de autobús 1, 9 y 19',
      busLinesDist: 'A 150 metros',
      healthCenter: 'Centro de Salud Lagasca',
      healthCenterDist: 'A 380 metros',
    },
  },
  notFound: {
    pageTitle: 'Oops!',
    message: "This screen doesn't exist.",
    homeLink: 'Go to home screen!',
  },
  suggestionChips: {
    searchForA11y: (chip: string) => `Search for ${chip}`,
  },
} as const;

export type Labels = typeof labels;
