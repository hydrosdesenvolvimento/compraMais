/// <reference types="cypress" />
// E2E (Cypress) — autocadastro + fallback manual (US1). Roda contra o app servido em CI.

describe('Autocadastro do fornecedor (US1)', () => {
  it('cadastra via CNPJ com autopreenchimento', () => {
    cy.visit('/#/cadastro');
    cy.get('[data-cy=cnpj]').type('12.345.678/0001-90');
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=razao-social]').should('not.have.value', '');
    cy.get('[data-cy=criar-conta]').click();
    cy.location('pathname').should('include', '/inicio');
  });

  it('exibe fallback manual quando a Receita está indisponível', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 503, body: { frescor: 'indisponivel' } });
    cy.visit('/#/cadastro');
    cy.get('[data-cy=cnpj]').type('12.345.678/0001-90');
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=preencher-manual]').should('be.visible');
  });
});
