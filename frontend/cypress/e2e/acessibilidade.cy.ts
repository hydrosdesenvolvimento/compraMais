/// <reference types="cypress" />
// Acessibilidade e-MAG / WCAG 2.1 AA (T037). Usa cypress-axe para auditar contraste, foco e ARIA.
import 'cypress-axe';

describe('Acessibilidade (e-MAG / WCAG 2.1 AA)', () => {
  for (const rota of ['/cadastro', '/editais', '/documentos', '/admin/covalidacao', '/contestacao', '/admin/editais', '/editais/contestar', '/admin/auditoria', '/titular', '/admin/dashboard', '/transparencia']) {
    it(`sem violações sérias em ${rota}`, () => {
      cy.visit('/#' + rota);
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
