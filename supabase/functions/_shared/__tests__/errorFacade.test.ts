import { AppError, ErrorCode, handleErrorResponse } from '../errorFacade';

describe('errorFacade', () => {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

  describe('AppError', () => {
    it('creates instance with defaults from ErrorCode', () => {
      const err = new AppError(ErrorCode.BAD_REQUEST);
      expect(err.code).toBe(ErrorCode.BAD_REQUEST);
      expect(err.status).toBe(400);
      expect(err.message).toBe('Solicitud inválida o parámetros incorrectos');
    });

    it('creates instance with custom message and details', () => {
      const err = new AppError(ErrorCode.VALIDATION_ERROR, 'Falta el campo catastro', 422, { field: 'catastro' });
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(err.status).toBe(422);
      expect(err.message).toBe('Falta el campo catastro');
      expect(err.details).toEqual({ field: 'catastro' });
    });

    it('factory methods create corresponding error instances', () => {
      expect(AppError.badRequest('bad').status).toBe(400);
      expect(AppError.unauthorized().status).toBe(401);
      expect(AppError.forbidden().status).toBe(403);
      expect(AppError.notFound().status).toBe(404);
      expect(AppError.conflict().status).toBe(409);
      expect(AppError.validation().status).toBe(422);
      expect(AppError.upstream().status).toBe(502);
      expect(AppError.timeout().status).toBe(504);
      expect(AppError.internal().status).toBe(500);
    });
  });

  describe('handleErrorResponse', () => {
    it('formats AppError into structured JSON response', async () => {
      const error = AppError.validation('El precio no puede ser negativo', { price: -50 });
      const response = handleErrorResponse(error, {
        logTag: 'test-fn',
        corsHeaders,
      });

      expect(response.status).toBe(422);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

      const body = await response.json();
      expect(body).toEqual({
        error: 'El precio no puede ser negativo',
        code: ErrorCode.VALIDATION_ERROR,
        details: { price: -50 },
      });
    });

    it('formats generic Error into internal error response by default', async () => {
      const error = new Error('Unexpected crash');
      const response = handleErrorResponse(error, {
        logTag: 'test-fn',
        corsHeaders,
      });

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unexpected crash',
        code: ErrorCode.INTERNAL_SERVER_ERROR,
      });
    });

    it('detects abort / timeout error and maps to TIMEOUT_ERROR 504', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const response = handleErrorResponse(abortError, {
        logTag: 'test-fn',
        corsHeaders,
      });

      expect(response.status).toBe(504);
      const body = await response.json();
      expect(body.code).toBe(ErrorCode.TIMEOUT_ERROR);
    });

    it('detects upstream AI vendor error in message and maps to 502', async () => {
      const error = new Error('Groq transcription failed (429)');
      const response = handleErrorResponse(error, {
        logTag: 'test-fn',
        corsHeaders,
      });

      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.code).toBe(ErrorCode.UPSTREAM_SERVICE_ERROR);
      expect(body.error).toBe('Groq transcription failed (429)');
    });

    it('uses fallbackCode and fallbackMessage when specified', async () => {
      const response = handleErrorResponse(null, {
        logTag: 'test-fn',
        corsHeaders,
        fallbackCode: ErrorCode.UPSTREAM_SERVICE_ERROR,
        fallbackMessage: 'Servicio de voz no disponible',
      });

      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Servicio de voz no disponible',
        code: ErrorCode.UPSTREAM_SERVICE_ERROR,
      });
    });
  });
});
