/// <reference types="cypress" />
// E2E (Cypress) — UC004: solicitar credenciamento e concluir por Termo de Aceite. A "prova de vida"
// (UC007) NÃO faz parte do fluxo (Release 2). Fluxo: vitrine → iniciar → capacidade → documentos →
// Termo de Aceite → status Pendente de Análise.

describe('Credenciamento por Termo de Aceite (UC004)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/editais', { body: [{ id: 'e1', objeto: 'Merenda escolar' }] }).as('vitrine');
    // Sem credenciamento ativo neste edital (204) → o wizard começa do zero, não retoma.
    cy.intercept('GET', '/editais/e1/credenciamentos/meu', { statusCode: 204, body: '' }).as('meu');
    cy.intercept('POST', '/editais/e1/credenciamentos', { body: { credenciamentoId: 'c1', estado: 'iniciado' } }).as('iniciar');
    // O wizard reporta o passo (UC004) ao navegar — best-effort; stub para determinismo.
    cy.intercept('PATCH', '/credenciamentos/c1/passo', { body: { passoAtual: 2 } }).as('passo');
    cy.intercept('POST', '/credenciamentos/c1/termo', { body: { estado: 'aceito', status: 'pendente_analise' } }).as('termo');
    // Passo 2 (RF002): catálogo de tipos exigidos × documentos do fornecedor. Um tipo ainda não enviado
    // → renderiza a dropzone `upload-doc`.
    cy.intercept('GET', '/catalogos/tipos-documento*', { body: [{ id: 't1', nome: 'Certidão Negativa de Débitos Estaduais', exigeValidade: true, situacao: 'ativo' }] }).as('tipos');
    cy.intercept('GET', '/fornecedores/*/documentos', { body: [] }).as('docs');
  });

  it('parte da vitrine e conclui em Pendente de Análise', () => {
    cy.visit('/#/editais');
    cy.wait('@vitrine');
    cy.get('[data-cy=iniciar-credenciamento]').first().click();

    // Passo 1 — capacidade (teto declarado, RN005)
    cy.get('[data-cy=capacidade]').type('500');
    cy.get('[data-cy=avancar]').click();
    cy.wait('@iniciar').its('request.body').should('deep.equal', { capacidade: 500 });

    // Passo 2 — documentos (reaproveitamento automático, RF002)
    cy.get('[data-cy=upload-doc]').should('exist');
    cy.get('[data-cy=avancar]').click();

    // Passo 3 — Termo de Aceite (RN016)
    cy.get('[data-cy=termo-aceite]').should('be.visible');
    cy.get('[data-cy=avancar]').should('be.disabled'); // exige o aceite
    cy.get('[data-cy=aceitar-termo]').check();
    cy.get('[data-cy=avancar]').click();
    cy.wait('@termo');

    // Passo 4 — conclusão
    cy.get('[data-cy=status-pendente]').should('be.visible');
    cy.get('[data-cy=prova-de-vida]').should('not.exist'); // UC007 fora do MVP
  });
});
