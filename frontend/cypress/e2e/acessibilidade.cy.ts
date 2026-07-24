/// <reference types="cypress" />
// Acessibilidade e-MAG / WCAG 2.1 AA (T037 / RNF006). Usa cypress-axe para auditar contraste, foco e ARIA.
//
// Correção em relação à versão original (que nunca chegou a ser executada): as rotas eram visitadas SEM
// sessão. Depois do AD-20 todas as protegidas redirecionam ao `/cadastro`, então as 11 auditorias
// avaliavam **a mesma tela de login** onze vezes — daí o resultado idêntico em todas. Cada rota agora é
// visitada com o perfil que de fato a acessa.
import 'cypress-axe';
import { visitarComo, type PerfilE2E } from '../support/sessao';

/** Rota → perfil que a enxerga (`VISIBILIDADE_PADRAO`); `null` = pública, sem sessão. */
const ROTAS: Array<{ rota: string; perfil: PerfilE2E | null }> = [
  { rota: '/cadastro', perfil: null },
  { rota: '/transparencia', perfil: null },
  { rota: '/editais', perfil: 'titular' },
  { rota: '/documentos', perfil: 'titular' },
  { rota: '/contestacao', perfil: 'titular' },
  { rota: '/titular', perfil: 'titular' },
  { rota: '/editais/contestar', perfil: 'titular' },
  { rota: '/admin/dashboard', perfil: 'smga' },
  { rota: '/admin/editais', perfil: 'smga' },
  { rota: '/admin/catalogos', perfil: 'smga' },
  { rota: '/admin/covalidacao', perfil: 'cpl' },
  { rota: '/admin/auditoria', perfil: 'administrador' },
];

describe('Acessibilidade (e-MAG / WCAG 2.1 AA)', () => {
  for (const { rota, perfil } of ROTAS) {
    it(`sem violações sérias em ${rota}`, () => {
      if (perfil) visitarComo(perfil, '/#' + rota);
      else cy.visit('/#' + rota);
      cy.injectAxe();
      cy.checkA11y(undefined, { includedImpacts: ['serious', 'critical'] });
    });
  }

  it('foco visível na navegação por teclado', () => {
    cy.visit('/#/cadastro');
    cy.get('body').tab();
    cy.focused().should('have.css', 'outline-style', 'solid');
  });
});
