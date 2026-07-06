/** Sessão do cliente: guarda o JWT retornado por /auth/login. (MVP — localStorage.) */
const CHAVE = 'compramais.token';

export function salvarToken(token: string): void {
  try { localStorage.setItem(CHAVE, token); } catch { /* ambiente sem storage */ }
}
export function obterToken(): string | null {
  try { return localStorage.getItem(CHAVE); } catch { return null; }
}
export function limparToken(): void {
  try { localStorage.removeItem(CHAVE); } catch { /* noop */ }
}
export function estaAutenticado(): boolean { return obterToken() !== null; }
