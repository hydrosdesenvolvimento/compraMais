/// <reference types="cypress" />
// E2E (Cypress) — UC018: re-sincronizar dados do CNPJ na tela "Minha conta". API stubada
// (cy.intercept) → determinístico. Hash routing. A rota /minha-conta renderiza com dados demo
// (fornecedorId `demo-fornecedor`), então o POST vai para /fornecedores/demo-fornecedor/sincronizar.

const SINC = (fid = 'demo-fornecedor') => `/fornecedores/${fid}/sincronizar`;

describe('Minha conta — re-sincronizar CNPJ (UC018)', () => {
  it('mostra a última sincronização e o botão "Sincronizar agora"', () => {
    cy.visit('/#/minha-conta');
    cy.get('[data-cy=card-sync]').should('be.visible');
    cy.get('[data-cy=sync-ultima]').should('be.visible');
    cy.get('[data-cy=sincronizar]').should('be.enabled');
  });

  it('sucesso: atualiza os dados oficiais e sinaliza sucesso (RF018)', () => {
    cy.intercept('POST', SINC(), { statusCode: 200, body: { status: 'sucesso', quando: '2026-07-06T09:00:00Z', fonte: 'Receita' } }).as('sinc');
    cy.visit('/#/minha-conta');
    cy.get('[data-cy=sincronizar]').click();
    cy.wait('@sinc');
    cy.get('[data-cy=sync-sucesso]').should('be.visible');
    cy.get('[data-cy=sync-revisao]').should('not.exist');
    cy.get('[data-cy=sync-erro]').should('not.exist');
  });

  it('exceção UC018: CNPJ inativo/baixado → sinaliza revisão da CPL', () => {
    cy.intercept('POST', SINC(), { statusCode: 200, body: { status: 'revisao', quando: '2026-07-06T09:00:00Z', fonte: 'Receita' } }).as('sinc');
    cy.visit('/#/minha-conta');
    cy.get('[data-cy=sincronizar]').click();
    cy.wait('@sinc');
    cy.get('[data-cy=sync-revisao]').should('be.visible');
    cy.get('[data-cy=sync-sucesso]').should('not.exist');
  });

  it('A1: Receita indisponível → sinaliza erro sem apagar a tela', () => {
    cy.intercept('POST', SINC(), { statusCode: 200, body: { status: 'erro' } }).as('sinc');
    cy.visit('/#/minha-conta');
    cy.get('[data-cy=sincronizar]').click();
    cy.wait('@sinc');
    cy.get('[data-cy=sync-erro]').should('be.visible');
    cy.get('[data-cy=sync-sucesso]').should('not.exist');
  });
});
