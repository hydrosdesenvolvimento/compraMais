/// <reference types="cypress" />
// E2E (Cypress) — contestação do fornecedor (US3): vê pendências e regulariza.

describe('Contestação do fornecedor (US3)', () => {
  it('exibe pendências com próximo passo', () => {
    cy.intercept('GET', '/fornecedores/*/pendencias', { body: [
      { tipo: 'documento', motivo: 'ilegível', proximoPasso: 'Reenviar documento' },
      { tipo: 'bloqueio', motivo: 'débito ativo', proximoPasso: 'Regularizar e reconsultar' },
    ] });
    cy.visit('/#/contestacao');
    cy.get('[data-cy=pendencia]').should('have.length', 2);
  });

  it('estado vazio quando sem pendências', () => {
    cy.intercept('GET', '/fornecedores/*/pendencias', { body: [] });
    cy.visit('/#/contestacao');
    cy.get('[data-cy=sem-pendencias]').should('be.visible');
  });
});
