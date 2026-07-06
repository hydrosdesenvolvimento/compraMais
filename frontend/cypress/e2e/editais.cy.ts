/// <reference types="cypress" />
// E2E (Cypress) — gestão de editais (US1): gestor cria e publica edital individualizado.

describe('Gestão de editais (US1)', () => {
  it('cria e publica um edital', () => {
    cy.intercept('GET', '/gestao/editais*', { body: [] }).as('lista');
    cy.intercept('POST', '/editais', { statusCode: 201, body: { editalId: 'e1', situacao: 'rascunho' } }).as('criar');
    cy.visit('/#/admin/editais');
    cy.get('[data-cy=objeto]').type('Merenda escolar');
    cy.get('[data-cy=cnae]').type('1091101');
    cy.get('[data-cy=quantitativos]').clear().type('100');
    cy.get('[data-cy=prazo]').type('2026-12-31');
    cy.get('[data-cy=criar]').click();
    cy.wait('@criar').its('request.body.secretariaId').should('exist'); // 1 secretaria (invariante)
  });

  it('lista por situação (QBE) e permite publicar rascunho', () => {
    cy.intercept('GET', '/gestao/editais*', { body: [{ id: 'e1', objeto: 'Merenda', secretariaId: 's1', situacao: 'rascunho' }] });
    cy.intercept('POST', '/editais/e1/publicar', { statusCode: 200, body: { situacao: 'publicado' } }).as('pub');
    cy.visit('/#/admin/editais');
    cy.get('[data-cy=edital]').should('have.length', 1);
    cy.get('[data-cy=publicar]').click();
    cy.wait('@pub');
  });
});
