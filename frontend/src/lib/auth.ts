/** Sessão do cliente: guarda o JWT e a identidade retornados por /auth/login. (MVP — localStorage.) */
const CHAVE_TOKEN = 'compramais.token';
const CHAVE_USUARIO = 'compramais.usuario';

/** Identidade da sessão. `empresaId` = id do fornecedor representado (titular/procurador). */
export interface Usuario {
  userId: string;
  papel: string;
  empresaId?: string;
}

/** Persiste token + identidade após o login/cadastro. */
export function salvarSessao(sessao: { token: string; usuario: Usuario }): void {
  try {
    localStorage.setItem(CHAVE_TOKEN, sessao.token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(sessao.usuario));
  } catch { /* ambiente sem storage */ }
}

export function obterToken(): string | null {
  try { return localStorage.getItem(CHAVE_TOKEN); } catch { return null; }
}

/** Identidade atual (ou null se não autenticado). */
export function obterUsuario(): Usuario | null {
  try {
    const raw = localStorage.getItem(CHAVE_USUARIO);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch { return null; }
}

export function limparSessao(): void {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
  } catch { /* noop */ }
}

export function estaAutenticado(): boolean { return obterToken() !== null; }
