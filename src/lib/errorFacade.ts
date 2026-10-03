import {
  ErrorCode,
  ErrorCodeType,
  STANDARD_CLIENT_ERROR_MESSAGES,
} from '../constants/errors';

export { ErrorCode };
export type { ErrorCodeType };

export interface StandardErrorEnvelope {
  code: ErrorCodeType;
  message: string;
  details?: unknown;
}

export function parseStandardError(error: unknown): StandardErrorEnvelope {
  if (!error) {
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: STANDARD_CLIENT_ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR],
    };
  }

  const errObj = error as any;
  const payload = errObj?.context || errObj;
  const candidateCode = payload?.code || errObj?.code;

  if (candidateCode && Object.values(ErrorCode).includes(candidateCode)) {
    const code = candidateCode as ErrorCodeType;
    return {
      code,
      message: payload?.message || payload?.error || STANDARD_CLIENT_ERROR_MESSAGES[code],
      details: payload?.details,
    };
  }

  const message = typeof payload?.message === 'string'
    ? payload.message
    : typeof errObj?.message === 'string'
      ? errObj.message
      : typeof payload?.error === 'string'
        ? payload.error
        : String(error);

  if (errObj?.name === 'FunctionsFetchError' || message.includes('fetch failed') || message.includes('Network request failed')) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: STANDARD_CLIENT_ERROR_MESSAGES[ErrorCode.NETWORK_ERROR],
      details: errObj,
    };
  }

  if (errObj?.name === 'AbortError' || message.includes('timeout') || message.includes('exceeded')) {
    return {
      code: ErrorCode.TIMEOUT_ERROR,
      message: STANDARD_CLIENT_ERROR_MESSAGES[ErrorCode.TIMEOUT_ERROR],
    };
  }

  if (message.includes('401') || message.includes('JWT') || message.includes('unauthorized')) {
    return {
      code: ErrorCode.UNAUTHORIZED,
      message: STANDARD_CLIENT_ERROR_MESSAGES[ErrorCode.UNAUTHORIZED],
    };
  }

  if (message.includes('403') || message.includes('forbidden') || message.includes('denied')) {
    return {
      code: ErrorCode.FORBIDDEN,
      message: STANDARD_CLIENT_ERROR_MESSAGES[ErrorCode.FORBIDDEN],
    };
  }

  if (message.includes('409') || message.includes('conflict') || message.includes('Ya existe')) {
    return {
      code: ErrorCode.CONFLICT,
      message: payload?.error || payload?.message || STANDARD_CLIENT_ERROR_MESSAGES[ErrorCode.CONFLICT],
      details: payload?.details,
    };
  }

  return {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: message || STANDARD_CLIENT_ERROR_MESSAGES[ErrorCode.INTERNAL_SERVER_ERROR],
    details: errObj,
  };
}
