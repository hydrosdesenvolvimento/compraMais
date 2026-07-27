/// <reference types="cypress" />
/**
 * Captura de telas REAIS para o Manual do Administrador (spec/manuais). Não é teste de regressão: cada
 * `it` visita uma tela do Painel Administrativo e salva um screenshot de página inteira. Cada tela é
 * capturada com o PERFIL que a acessa (RBAC + "telas por perfil"): operação com **smga**, configuração
 * com **administrador**. Requer o stack `--profile dev` no ar (backend + frontend + db + seed).
 *
 * Rodar:  docker compose --profile e2e run --rm frontend-e2e \
 *           npx cypress run --spec cypress/e2e/manual-admin.cy.ts
 */
import { CREDENCIAIS } from '../support/sessao';

// O display do container limita a 1280px e o fullPage do Cypress captura só a largura do viewport;
// o layout (sidebar + conteúdo) é mais largo. `zoom` reduzido dá largura CSS suficiente p/ caber tudo.
const ZOOM = '0.72';
function shot(nome: string) {
  cy.document().then((d) => { (d.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = ZOOM; });
  cy.wait(300);
  cy.screenshot(nome, { capture: 'fullPage', overwrite: true });
}
/** Captura só o viewport (para telas muito longas, como a trilha de auditoria). */
function shotViewport(nome: string) {
  cy.document().then((d) => { (d.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = ZOOM; });
  cy.wait(300);
  cy.screenshot(nome, { capture: 'viewport', overwrite: true });
}

type Perfil = keyof typeof CREDENCIAIS;
const sessao: Record<string, { token: string; usuario: unknown; telas: string[] }> = {};

/** Faz login (uma vez por perfil) e guarda token + identidade + telas visíveis. */
function login(perfil: Perfil) {
  return cy.request('POST', '/auth/login', CREDENCIAIS[perfil]).then((r) => {
    const token = r.body.token as string;
    return cy.request({ url: '/permissoes/telas/me', headers: { authorization: `Bearer ${token}` } }).then((t) => {
      const telas = (Array.isArray(t.body) ? t.body : t.body.telas ?? t.body.visiveis ?? []) as string[];
      sessao[perfil] = { token, usuario: r.body.usuario, telas };
    });
  });
}

/** Visita uma rota admin já autenticado como `perfil` (token + identidade + telas no localStorage). */
function abrir(perfil: Perfil, rota: string) {
  const s = sessao[perfil];
  cy.visit(rota, {
    onBeforeLoad(win) {
      win.localStorage.setItem('compramais.token', s.token);
      win.localStorage.setItem('compramais.usuario', JSON.stringify(s.usuario));
      win.localStorage.setItem('compramais.telas', JSON.stringify(s.telas));
    },
  });
  cy.get('[data-cy=app-shell]', { timeout: 20000 }).should('exist');
  cy.wait(1400); // deixa as queries resolverem
}

describe('Manual do Administrador — captura de telas', () => {
  before(() => { login('smga'); login('administrador'); });
  beforeEach(() => cy.viewport(1280, 900));

  it('00 — tela de acesso', () => {
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]', { timeout: 20000 }).should('exist');
    cy.wait(500);
    shot('00-login');
  });

  // ---- Operação (perfil SMGA) -------------------------------------------- //
  it('01 — Dashboard (visão geral)', () => { abrir('smga', '/#/admin/dashboard'); shot('01-dashboard'); });
  it('02 — Fornecedores', () => { abrir('smga', '/#/admin/fornecedores'); shot('02-fornecedores'); });
  it('03 — Gestão de Editais', () => { abrir('smga', '/#/admin/editais'); shot('03-editais'); });
  it('04 — Credenciamento em Edital', () => { abrir('smga', '/#/admin/credenciamento'); shot('04-credenciamento'); });
  it('05 — Análise Documental', () => { abrir('smga', '/#/admin/analise-documental'); shot('05-analise-documental'); });
  it('06 — Distribuição Inteligente', () => {
    abrir('smga', '/#/admin/distribuicao');
    shot('06-distribuicao');
    // Best-effort: abre o detalhe do rateio de um edital, se houver.
    cy.get('body').then(($b) => {
      if ($b.find('[data-cy=ver-distribuicao]').length) {
        cy.get('[data-cy=ver-distribuicao]').first().click();
        cy.wait(1500);
        shot('06b-distribuicao-detalhe');
      }
    });
  });
  it('07 — Cadastro de Reserva', () => { abrir('smga', '/#/admin/cadastro-reserva'); shot('07-cadastro-reserva'); });
  it('08 — Desistências', () => { abrir('smga', '/#/admin/desistencias'); shot('08-desistencias'); });
  it('09 — Malote SEI', () => { abrir('smga', '/#/admin/malote'); shot('09-malote'); });
  it('10 — Catálogos', () => { abrir('smga', '/#/admin/catalogos'); shot('10-catalogos'); });
  it('11 — Contestações de CNAE', () => { abrir('smga', '/#/admin/contestacoes'); shot('11-contestacoes'); });
  it('12 — Atendimento LGPD', () => { abrir('smga', '/#/admin/lgpd'); shot('12-lgpd'); });
  it('13 — Relatórios', () => { abrir('smga', '/#/admin/relatorios'); shot('13-relatorios'); });

  // ---- Configuração (perfil Administrador) ------------------------------- //
  it('14 — Secretarias', () => { abrir('administrador', '/#/admin/secretarias'); shot('14-secretarias'); });
  it('15 — Usuários internos', () => { abrir('administrador', '/#/admin/usuarios'); shot('15-usuarios'); });
  // Rota, chave de tela e nome do print seguem `setores-industriais` de propósito — só o rótulo mudou.
  it('16 — Cadastro de Atividades (CNAE)', () => { abrir('administrador', '/#/admin/setores-industriais'); shot('16-setores-industriais'); });
  it('17 — Tipos de Arquivos', () => { abrir('administrador', '/#/admin/tipos-arquivos'); shot('17-tipos-arquivos'); });
  it('18 — Auditoria', () => { abrir('administrador', '/#/admin/auditoria'); shotViewport('18-auditoria'); });
  it('19 — Administração de Telas por Perfil', () => { abrir('administrador', '/#/admin/perfis'); shot('19-perfis'); });
});
