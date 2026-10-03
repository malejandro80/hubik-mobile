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
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export const ERROR_STATUS_BY_CODE: Record<ErrorCodeType, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.UPSTREAM_SERVICE_ERROR]: 502,
  [ErrorCode.TIMEOUT_ERROR]: 504,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
};

export const STANDARD_ERROR_MESSAGES: Record<ErrorCodeType, string> = {
  [ErrorCode.BAD_REQUEST]: 'Solicitud inválida o parámetros incorrectos',
  [ErrorCode.UNAUTHORIZED]: 'Autenticación requerida para acceder al recurso',
  [ErrorCode.FORBIDDEN]: 'Acceso no autorizado para realizar esta acción',
  [ErrorCode.NOT_FOUND]: 'El recurso solicitado no fue encontrado',
  [ErrorCode.CONFLICT]: 'Ya existe un recurso con los datos suministrados',
  [ErrorCode.VALIDATION_ERROR]: 'Los datos suministrados no superaron la validación',
  [ErrorCode.UPSTREAM_SERVICE_ERROR]: 'Error en servicio externo de inteligencia artificial',
  [ErrorCode.TIMEOUT_ERROR]: 'Tiempo de espera de la solicitud agotado',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Error interno en la ejecución de la función',
};

export const STATUS_TO_DEFAULT_CODE: Record<number, ErrorCodeType> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  422: ErrorCode.VALIDATION_ERROR,
  502: ErrorCode.UPSTREAM_SERVICE_ERROR,
  504: ErrorCode.TIMEOUT_ERROR,
  500: ErrorCode.INTERNAL_SERVER_ERROR,
};
