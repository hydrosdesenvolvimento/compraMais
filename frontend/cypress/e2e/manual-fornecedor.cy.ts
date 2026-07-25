/// <reference types="cypress" />
/**
 * Captura de telas REAIS para o Manual do Fornecedor (spec/manuais). Não é um teste de regressão: cada
 * `it` visita uma etapa da jornada do fornecedor (do autocadastro ao fornecimento) e salva um screenshot
 * de página inteira. Requer o stack `--profile dev` no ar (backend + frontend + db + seed) e um edital
 * publicado compatível com o CNAE do fornecedor demo (para a vitrine e o credenciamento).
 *
 * Rodar:  docker compose --profile e2e run --rm frontend-e2e \
 *           npx cypress run --spec cypress/e2e/manual-fornecedor.cy.ts
 * Os PNGs saem em cypress/screenshots/manual-fornecedor.cy.ts/.
 */
import { CREDENCIAIS } from '../support/sessao';

const VIEW: [number, number] = [1280, 900];
// O display do container limita a captura a 1280px de largura, e o fullPage do Cypress só captura a
// largura do viewport — o layout (sidebar + conteúdo) é mais largo e sairia cortado à direita. Aplicar
// `zoom` reduzido dá mais largura CSS ao layout (1280/zoom), que passa a caber inteiro no quadro.
const ZOOM = '0.72';
function shot(nome: string) {
  cy.document().then((d) => { (d.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = ZOOM; });
  cy.wait(250);
  cy.screenshot(nome, { capture: 'fullPage', overwrite: true });
}

let token = '';
let usuario: Record<string, unknown> = {};

/** Visita já autenticado como o fornecedor demo (titular). */
function entrar(rota: string) {
  cy.visit(rota, {
    onBeforeLoad(win) {
      win.localStorage.setItem('compramais.token', token);
      win.localStorage.setItem('compramais.usuario', JSON.stringify(usuario));
    },
  });
  cy.get('[data-cy=app-shell]', { timeout: 20000 }).should('exist');
  cy.wait(1200); // deixa as queries (TanStack) resolverem antes do screenshot
}

describe('Manual do Fornecedor — captura de telas', () => {
  before(() => {
    cy.request('POST', '/auth/login', CREDENCIAIS.titular).then((r) => {
      token = r.body.token;
      usuario = r.body.usuario;
    });
  });

  beforeEach(() => cy.viewport(...VIEW));

  // ---- Público: autenticação e autocadastro ------------------------------- //
  it('01 — tela de acesso (login)', () => {
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]', { timeout: 20000 }).should('exist');
    cy.wait(600);
    shot('01-login');
  });

  it('02 — autocadastro: criar conta', () => {
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]').click();
    cy.wait(500);
    shot('02-cadastro-criar-conta');
  });

  it('03 — autocadastro: dados da empresa (consulta CNPJ)', () => {
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]').click();
    cy.get('[data-cy=cnpj]').type('11222333000181');
    cy.get('[data-cy=consultar]').click();
    cy.wait(2500); // resposta da Receita (ou fallback manual)
    shot('03-cadastro-dados-empresa');
  });

  // ---- Portal do fornecedor (autenticado) --------------------------------- //
  it('04 — início (painel do fornecedor)', () => { entrar('/#/inicio'); shot('04-inicio'); });

  it('05 — vitrine de editais compatíveis', () => {
    entrar('/#/editais');
    shot('05-editais-vitrine');
  });

  it('06 — credenciamento: passo a passo', () => {
    const auth = { authorization: `Bearer ${token}` };
    // Escolhe, na vitrine, um edital compatível SEM credenciamento em andamento (assistente pristino).
    cy.request({ method: 'GET', url: '/fornecedores/demo-fornecedor/credenciamentos', headers: auth }).then((c) => {
      const jaIniciados = new Set((c.body as Array<{ editalId: string }>).map((x) => x.editalId));
      cy.request({ method: 'GET', url: '/editais', headers: auth }).then((r) => {
        const compat = r.body as Array<{ id: string }>;
        const edital = compat.find((e) => !jaIniciados.has(e.id)) ?? compat[0];
        expect(edital, 'há edital compatível na vitrine').to.exist;
        entrar(`/#/credenciamento/${edital.id}`);

      // Passo 1 — seleciona o item e declara o teto de capacidade (RN005)
      cy.get('[data-cy=capacidade-item-check]').first().check();
      cy.get('[data-cy=capacidade-item-teto]').first().clear().type('500');
      cy.wait(400);
      shot('06a-credenciamento-passo1-capacidade');
      cy.get('[data-cy=avancar]').click();

      // Passo 2 — documentos (reaproveitamento automático, RF002)
      cy.get('[data-cy=termo-aceite], [data-cy=upload-doc], [data-cy=doc-sem-pendentes]', { timeout: 15000 }).should('exist');
      cy.wait(800);
      shot('06b-credenciamento-passo2-documentos');

      // Avança ao Termo se ainda não estiver nele
      cy.get('body').then(($b) => {
        if (!$b.find('[data-cy=termo-aceite]').length && $b.find('[data-cy=avancar]').length) {
          cy.get('[data-cy=avancar]').click({ force: true });
          cy.wait(1000);
        }
      });

      // Passo 3 — Termo de Aceite (RN016)
      cy.get('body').then(($b) => {
        if ($b.find('[data-cy=termo-aceite]').length) {
          cy.get('[data-cy=aceitar-termo]').check();
          cy.wait(300);
          shot('06c-credenciamento-passo3-termo');
          cy.get('[data-cy=avancar]').click();
          cy.wait(2500);
          // Passo 4 — conclusão (best-effort: captura o que aparecer, sem falhar a captura)
          shot('06d-credenciamento-concluido');
        }
      });
      });
    });
  });

  it('07 — meus credenciamentos', () => { entrar('/#/credenciamentos'); shot('07-meus-credenciamentos'); });

  it('08 — detalhe de um credenciamento', () => {
    cy.request({ method: 'GET', url: '/fornecedores/demo-fornecedor/credenciamentos', headers: { authorization: `Bearer ${token}` } }).then((r) => {
      const lista = r.body as Array<{ id: string }>;
      if (lista.length) {
        entrar(`/#/credenciamentos/${lista[0].id}`);
        shot('08-credenciamento-detalhe');
      }
    });
  });

  it('09 — meus documentos', () => { entrar('/#/documentos'); shot('09-documentos'); });

  it('10 — demandas distribuídas (cotas/fornecimento)', () => { entrar('/#/demandas'); shot('10-demandas'); });

  it('11 — notificações', () => { entrar('/#/notificacoes'); shot('11-notificacoes'); });

  it('12 — minha conta', () => { entrar('/#/minha-conta'); shot('12-minha-conta'); });

  it('13 — transparência', () => { entrar('/#/transparencia'); shot('13-transparencia'); });
});
