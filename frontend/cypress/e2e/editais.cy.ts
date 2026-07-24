/// <reference types="cypress" />
// E2E (Cypress) — Gestão de Editais (US1): gestor cria e publica edital individualizado em /admin/editais.
import { visitarComo } from '../support/sessao';

describe('Gestão de editais (US1)', () => {
  const secretarias = [
    { id: 's1', sigla: 'SEME', nome: 'Educação', ativo: true, situacao: 'ativo' },
    { id: 's2', sigla: 'SEMSA', nome: 'Saúde', ativo: true, situacao: 'ativo' },
  ];

  it('cria um edital pelo modal "Novo edital"', () => {
    cy.intercept('GET', '/gestao/editais*', { body: { items: [], total: 0 } }).as('lista');
    cy.intercept('GET', '/catalogos/secretarias*', { body: secretarias });
    cy.intercept('POST', '/editais', { statusCode: 201, body: { editalId: 'e1', situacao: 'rascunho' } }).as('criar');
    visitarComo('smga', '/#/admin/editais');

    cy.get('[data-cy=novo-edital]').click();
    cy.get('[data-cy=modal-novo-edital]').should('be.visible');
    cy.get('[data-cy=objeto]').type('Merenda escolar');
    cy.get('[data-cy=secretaria]').select('s2');
    cy.get('[data-cy=cnae]').type('1091101');
    cy.get('[data-cy=quantitativos]').clear().type('100');
    cy.get('[data-cy=prazo]').type('2026-12-31');
    cy.get('[data-cy=criar]').click();
    cy.wait('@criar').its('request.body.secretariaId').should('exist'); // 1 secretaria (invariante RN007)
  });

  it('lista os editais (QBE) e permite publicar um rascunho', () => {
    // `GET /gestao/editais` responde o envelope paginado { items, total } (QBE) — um array cru faz o
    // `.items` da camada de API virar undefined e a lista renderizar vazia.
    cy.intercept('GET', '/gestao/editais*', {
      body: {
        items: [{ id: 'e1', numero: 'ED-2026/001', objeto: 'Merenda', secretariaId: 's1', situacao: 'rascunho', cnaesAlvo: ['1091101'], quantitativos: 100, prazoVigencia: '2026-12-31' }],
        total: 1,
      },
    });
    cy.intercept('GET', '/catalogos/secretarias*', { body: secretarias });
    cy.intercept('POST', '/editais/e1/publicar', { statusCode: 200, body: { situacao: 'publicado' } }).as('pub');
    visitarComo('smga', '/#/admin/editais');

    cy.get('[data-cy=item-edital]').should('have.length', 1);
    cy.get('[data-cy=publicar]').click();
    cy.wait('@pub');
  });
});
