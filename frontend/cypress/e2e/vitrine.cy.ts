/// <reference types="cypress" />
// E2E (Cypress) — vitrine filtrada por CNAE + estado vazio (US2).

describe('Vitrine de editais (US2)', () => {
  it('lista só editais compatíveis', () => {
    cy.visit('/#/editais');
    cy.get('[data-cy=edital-item]').each(($el) => {
      cy.wrap($el).should('have.attr', 'data-compativel', 'true');
    });
  });

  it('mostra estado vazio orientado quando não há compatíveis', () => {
    cy.intercept('GET', '/editais', { body: [] });
    cy.visit('/#/editais');
    cy.get('[data-cy=estado-vazio]').should('be.visible');
  });
});
