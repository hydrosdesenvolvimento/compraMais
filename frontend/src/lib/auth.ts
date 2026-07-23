/** Sessão do cliente: guarda o JWT e a identidade retornados por /auth/login. (MVP — localStorage.) */
const CHAVE_TOKEN = 'compramais.token';
const CHAVE_USUARIO = 'compramais.usuario';
/** Telas do Painel Admin visíveis ao papel da sessão (cache p/ as guardas de rota síncronas). */
const CHAVE_TELAS = 'compramais.telas';

/** Identidade da sessão. `empresaId` = id do fornecedor representado (titular/procurador). */
export interface Usuario {
  userId: string;
  papel: string;
  empresaId?: string;
  nome?: string;
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

/**
 * Atualiza campos da identidade em sessão (ex.: `nome` após o usuário se renomear na "Minha conta"),
 * preservando token e demais claims. Mantém o chip do topo (AppShell) coerente sem reautenticar.
 */
export function atualizarUsuarioSessao(patch: Partial<Usuario>): void {
  const atual = obterUsuario();
  if (!atual) return;
  try { localStorage.setItem(CHAVE_USUARIO, JSON.stringify({ ...atual, ...patch })); } catch { /* noop */ }
}

export function limparSessao(): void {
  try {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_USUARIO);
    localStorage.removeItem(CHAVE_TELAS);
  } catch { /* noop */ }
}

export function estaAutenticado(): boolean { return obterToken() !== null; }

/**
 * Papel interno = servidor da Prefeitura (não `titular`/`procurador`). Espelha `ehPapelInterno` do
 * backend (identity-provider). Define qual portal/shell o usuário usa: interno → `/admin`, fornecedor → `/inicio`.
 */
export function ehPapelInterno(papel: string | undefined): boolean {
  return !!papel && papel !== 'titular' && papel !== 'procurador';
}

/** Cache das telas admin visíveis ao papel da sessão (preenchido no login e atualizado pelo ShellAdmin). */
export function salvarTelasAdmin(telas: string[]): void {
  try { localStorage.setItem(CHAVE_TELAS, JSON.stringify(telas)); } catch { /* noop */ }
}

export function obterTelasAdmin(): string[] | null {
  try {
    const raw = localStorage.getItem(CHAVE_TELAS);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch { return null; }
}
