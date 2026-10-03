import {
  ErrorCode,
  ErrorCodeType,
  ERROR_STATUS_BY_CODE,
  STANDARD_ERROR_MESSAGES,
  STATUS_TO_DEFAULT_CODE,
} from './errorConstants.ts';

export { ErrorCode };
export type { ErrorCodeType };

export interface ErrorResponseBody {
  error: string;
  code: ErrorCodeType;
  details?: unknown;
}

export interface ErrorHandlingOptions {
  logTag: string;
  corsHeaders: Record<string, string>;
  fallbackCode?: ErrorCodeType;
  fallbackMessage?: string;
  requestStart?: number;
}

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ErrorCodeType, message?: string, status?: number, details?: unknown) {
    super(message ?? STANDARD_ERROR_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.status = status ?? ERROR_STATUS_BY_CODE[code];
    this.details = details;
  }

  static badRequest(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.BAD_REQUEST, message, 400, details);
  }

  static unauthorized(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401, details);
  }

  static forbidden(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403, details);
  }

  static notFound(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message, 404, details);
  }

  static conflict(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.CONFLICT, message, 409, details);
  }

  static validation(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 422, details);
  }

  static upstream(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.UPSTREAM_SERVICE_ERROR, message, 502, details);
  }

  static timeout(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.TIMEOUT_ERROR, message, 504, details);
  }

  static internal(message?: string, details?: unknown): AppError {
    return new AppError(ErrorCode.INTERNAL_SERVER_ERROR, message, 500, details);
  }
}

function resolveErrorMetadata(
  error: unknown,
  fallbackCode: ErrorCodeType,
  fallbackMessage?: string
): { code: ErrorCodeType; status: number; message: string; details?: unknown } {
  if (error instanceof AppError) {
    return {
      code: error.code,
      status: error.status,
      message: error.message,
      details: error.details,
    };
  }

  const errObj = error as any;
  const rawMessage = typeof errObj?.message === 'string' && errObj.message.trim() ? errObj.message.trim() : undefined;
  const rawStatus = typeof errObj?.status === 'number' ? errObj.status : undefined;

  if (errObj?.name === 'AbortError' || rawMessage?.toLowerCase().includes('timeout')) {
    return {
      code: ErrorCode.TIMEOUT_ERROR,
      status: 504,
      message: rawMessage ?? STANDARD_ERROR_MESSAGES[ErrorCode.TIMEOUT_ERROR],
    };
  }

  if (
    rawMessage?.toLowerCase().includes('groq') ||
    rawMessage?.toLowerCase().includes('whisper') ||
    rawMessage?.toLowerCase().includes('gemini') ||
    rawMessage?.toLowerCase().includes('transcrib')
  ) {
    return {
      code: ErrorCode.UPSTREAM_SERVICE_ERROR,
      status: 502,
      message: rawMessage ?? fallbackMessage ?? STANDARD_ERROR_MESSAGES[ErrorCode.UPSTREAM_SERVICE_ERROR],
    };
  }

  if (rawStatus && STATUS_TO_DEFAULT_CODE[rawStatus]) {
    const code = STATUS_TO_DEFAULT_CODE[rawStatus];
    return {
      code,
      status: rawStatus,
      message: rawMessage ?? fallbackMessage ?? STANDARD_ERROR_MESSAGES[code],
    };
  }

  return {
    code: fallbackCode,
    status: ERROR_STATUS_BY_CODE[fallbackCode],
    message: rawMessage ?? fallbackMessage ?? STANDARD_ERROR_MESSAGES[fallbackCode],
    details: errObj?.details,
  };
}

export function handleErrorResponse(
  error: unknown,
  options: ErrorHandlingOptions
): Response {
  const fallbackCode = options.fallbackCode ?? ErrorCode.INTERNAL_SERVER_ERROR;
  const { code, status, message, details } = resolveErrorMetadata(error, fallbackCode, options.fallbackMessage);

  const durationText = options.requestStart ? ` after ${Date.now() - options.requestStart}ms` : '';
  console.error(`❌ [${options.logTag}] Error [${code}] (${status})${durationText}:`, error);

  const body: ErrorResponseBody = {
    error: message,
    code,
    ...(details !== undefined ? { details } : {}),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...options.corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
