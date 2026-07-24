/// <reference types="cypress" />
// E2E (Cypress) — vitrine filtrada por CNAE + estado vazio (US2).
import { visitarComo } from '../support/sessao';

describe('Vitrine de editais (US2)', () => {
  it('lista só editais compatíveis', () => {
    // A vitrine resolve o fornecedor pelo token (AD-20): sem sessão o backend responde 401 e a lista
    // nasce vazia — o `each` sobre zero elementos passaria vazio e o teste não provaria nada.
    cy.intercept('GET', '/editais*', {
      body: [
        { id: 'e1', numero: 'ED-2026/001', objeto: 'Merenda escolar', cnaesAlvo: ['1412601'], quantitativos: 100, prazoVigencia: '2026-12-31', situacao: 'publicado' },
        { id: 'e2', numero: 'ED-2026/002', objeto: 'Uniformes', cnaesAlvo: ['1412601'], quantitativos: 50, prazoVigencia: '2026-11-30', situacao: 'publicado' },
      ],
    }).as('vitrine');
    visitarComo('titular', '/#/editais');
    cy.wait('@vitrine');

    cy.get('[data-cy=edital-item]').should('have.length', 2).each(($el) => {
      cy.wrap($el).should('have.attr', 'data-compativel', 'true');
    });
  });

  it('mostra estado vazio orientado quando não há compatíveis', () => {
    cy.intercept('GET', '/editais*', { body: [] });
    visitarComo('titular', '/#/editais');
    cy.get('[data-cy=estado-vazio]').should('be.visible');
  });
});
