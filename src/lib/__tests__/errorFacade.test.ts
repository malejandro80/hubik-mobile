import { ErrorCode, parseStandardError } from '../errorFacade';

describe('src/lib/errorFacade', () => {
  it('parses error with existing ErrorCode', () => {
    const error = { code: ErrorCode.VALIDATION_ERROR, message: 'Campo inválido' };
    const parsed = parseStandardError(error);

    expect(parsed.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(parsed.message).toBe('Campo inválido');
  });

  it('detects network drop as NETWORK_ERROR', () => {
    const error = new Error('fetch failed');
    (error as any).name = 'FunctionsFetchError';

    const parsed = parseStandardError(error);
    expect(parsed.code).toBe(ErrorCode.NETWORK_ERROR);
    expect(parsed.message).toContain('conexión');
  });

  it('detects timeout as TIMEOUT_ERROR', () => {
    const error = new Error('Connection timeout exceeded');
    const parsed = parseStandardError(error);

    expect(parsed.code).toBe(ErrorCode.TIMEOUT_ERROR);
  });

  it('detects 401 as UNAUTHORIZED', () => {
    const error = new Error('JWT expired (401)');
    const parsed = parseStandardError(error);

    expect(parsed.code).toBe(ErrorCode.UNAUTHORIZED);
  });

  it('detects 403 as FORBIDDEN', () => {
    const error = new Error('Permission denied (403)');
    const parsed = parseStandardError(error);

    expect(parsed.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('detects 409 conflict as CONFLICT', () => {
    const error = new Error('Ya existe una propiedad registrada con esa referencia catastral (409)');
    const parsed = parseStandardError(error);

    expect(parsed.code).toBe(ErrorCode.CONFLICT);
    expect(parsed.message).toContain('Ya existe');
  });

  it('extracts structured payload from error.context if present', () => {
    const error = {
      name: 'FunctionsHttpError',
      context: {
        code: ErrorCode.CONFLICT,
        error: 'Ya existe una propiedad registrada con esa referencia catastral',
      },
    };
    const parsed = parseStandardError(error);

    expect(parsed.code).toBe(ErrorCode.CONFLICT);
    expect(parsed.message).toBe('Ya existe una propiedad registrada con esa referencia catastral');
  });

  it('defaults to INTERNAL_SERVER_ERROR for unknown error', () => {
    const parsed = parseStandardError(null);
    expect(parsed.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
  });
});
