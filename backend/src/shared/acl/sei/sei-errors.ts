// Portado de ../api_sei (sei-sdk) `core/errors.ts` — modelo de implementação da integração SEI.
export type SeiErrorCode =
  | 'login_failed'
  | 'session_expired'
  | 'not_found'
  | 'parse_error'
  | 'too_many_redirects'
  | 'http_error'
  | 'not_configured';

/** Erro de domínio da integração SEI, com código estável para tratamento programático. */
export class SeiError extends Error {
  constructor(
    readonly code: SeiErrorCode,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'SeiError';
  }
}
