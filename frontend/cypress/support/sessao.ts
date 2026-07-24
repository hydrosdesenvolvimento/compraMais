/// <reference types="cypress" />

/**
 * Sessão real para os specs E2E (AD-20 / PRJ-DEC-14).
 *
 * Depois que a identidade passou a vir do **JWT verificado** (e não mais do header `x-papel`), visitar
 * uma rota sem sessão deixou de ser neutro: as rotas protegidas redirecionam para `/cadastro` e as
 * chamadas autenticadas respondem 401 — que o tratador global traduz em "Sessão expirada" e navega para
 * o login, desmontando a tela sob teste. Injetar um token de fachada (`'jwt.mock'`) não resolve: ele
 * passa pelas guardas do cliente, mas qualquer requisição não stubada volta 401 e dispara o mesmo
 * redirecionamento.
 *
 * Por isso o login aqui é **real**, contra o backend no ar — o mesmo caminho do usuário. Requer o stack
 * de pé (`docker compose --profile dev`) com o seed aplicado.
 */
export const CREDENCIAIS = {
  titular: { email: 'fornecedor@demo.local', senha: 'fornecedor123' },
  smga: { email: 'smga@compramais.local', senha: 'smga123456' },
  cpl: { email: 'admin@compramais.local', senha: 'admin12345' },
  administrador: { email: 'administrador@compramais.local', senha: 'admin12345' },
} as const;

export type PerfilE2E = keyof typeof CREDENCIAIS;

/**
 * Autentica e grava a sessão no `localStorage` da janela sob teste. Chame ANTES do `cy.visit` que
 * exercita a tela — o `onBeforeLoad` garante que a sessão já exista quando as guardas de rota rodam.
 */
export function entrarComo(perfil: PerfilE2E): void {
  cy.request('POST', '/auth/login', CREDENCIAIS[perfil]).then((r) => {
    cy.wrap(r.body.token as string).as('token');
    cy.wrap(r.body.usuario as Record<string, unknown>).as('usuario');
  });
}

/** `cy.visit` já autenticado como `perfil`. Atalho para o par entrar + visitar, que é a regra. */
export function visitarComo(perfil: PerfilE2E, rota: string): void {
  cy.request('POST', '/auth/login', CREDENCIAIS[perfil]).then((r) => {
    cy.visit(rota, {
      onBeforeLoad(win) {
        win.localStorage.setItem('compramais.token', r.body.token);
        win.localStorage.setItem('compramais.usuario', JSON.stringify(r.body.usuario));
      },
    });
  });
}
