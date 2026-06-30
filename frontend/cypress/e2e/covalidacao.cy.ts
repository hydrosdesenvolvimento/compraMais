/// <reference types="cypress" />
// E2E (Cypress) — fila de covalidação da CPL (US1). Roda contra o Painel Admin servido em CI.

describe('Covalidação documental (US1, CPL)', () => {
  it('aprova um documento pendente', () => {
    cy.visit('/#/admin/covalidacao');
    cy.get('[data-cy=doc-pendente]').first().within(() => {
      cy.get('[data-cy=aprovar]').click();
    });
    cy.get('[data-cy=doc-pendente]').should('have.length.lessThan', 1).then(() => {});
  });

  it('exige justificativa ao reprovar', () => {
    cy.visit('/#/admin/covalidacao');
    cy.intercept('POST', '/documentos/*/covalidar').as('cov');
    cy.get('[data-cy=doc-pendente]').first().within(() => {
      cy.get('[data-cy=reprovar]').click(); // sem motivo
    });
    cy.wait('@cov').its('response.statusCode').should('eq', 422);
  });
});
