export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UPSTREAM_SERVICE_ERROR: 'UPSTREAM_SERVICE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export const STANDARD_CLIENT_ERROR_MESSAGES: Record<ErrorCodeType, string> = {
  [ErrorCode.BAD_REQUEST]: 'Solicitud no válida. Por favor, revisa los datos ingresados.',
  [ErrorCode.UNAUTHORIZED]: 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.',
  [ErrorCode.FORBIDDEN]: 'No tienes permisos suficientes para realizar esta acción.',
  [ErrorCode.NOT_FOUND]: 'No encontramos la información solicitada.',
  [ErrorCode.CONFLICT]: 'Ya existe un registro con estos datos.',
  [ErrorCode.VALIDATION_ERROR]: 'Los datos proporcionados no son válidos.',
  [ErrorCode.UPSTREAM_SERVICE_ERROR]: 'El servicio de inteligencia artificial no está disponible temporalmente.',
  [ErrorCode.TIMEOUT_ERROR]: 'La respuesta tardó demasiado tiempo. Inténtalo de nuevo.',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Ocurrió un error inesperado. Por favor, inténtalo más tarde.',
  [ErrorCode.NETWORK_ERROR]: 'No pudimos conectar con el servidor. Comprueba tu conexión a internet.',
};
