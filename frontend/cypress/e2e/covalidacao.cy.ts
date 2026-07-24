/// <reference types="cypress" />
// E2E (Cypress) — fila de covalidação da CPL (US1 / UC006).
//
// Tela legada: o fluxo de produção migrou para "Análise Documental" e `covalidacao` saiu do menu, mas a
// rota/página seguem no código para reuso — este spec guarda o comportamento delas.
//
// Duas correções em relação à versão original, que nunca chegou a ser executada:
//  • a fila não era stubada e a rota é protegida (AD-20) — sem sessão da CPL nem dados, `doc-pendente`
//    nunca existia;
//  • o segundo caso afirmava o contrato ANTIGO ("reprovar sem motivo → o backend responde 422"). A tela
//    hoje **impede a submissão**: o botão Reprovar fica desabilitado enquanto não há justificativa
//    (RF004/RN003). Afirmar o 422 exigiria devolver à UI um caminho pior; o caso passou a verificar a
//    guarda do cliente e o envio já com a justificativa preenchida.
import { visitarComo } from '../support/sessao';

const PENDENTES = [
  { id: 'doc-1', tipo: 'Contrato Social', status: 'pendente', enviadoEm: '2026-07-20T10:00:00Z' },
  { id: 'doc-2', tipo: 'Certidão FGTS', status: 'pendente', enviadoEm: '2026-07-21T10:00:00Z' },
];

function abrirFila(): void {
  cy.intercept('GET', '/fornecedores/*/documentos/pendentes*', { body: PENDENTES }).as('fila');
  visitarComo('cpl', '/#/admin/covalidacao');
  cy.wait('@fila');
}

describe('Covalidação documental (US1, CPL)', () => {
  it('aprova um documento pendente', () => {
    abrirFila();
    cy.intercept('POST', '/documentos/doc-1/covalidar', { statusCode: 200, body: { status: 'aprovado' } }).as('aprovar');

    cy.get('[data-cy=doc-pendente]').should('have.length', 2).first().within(() => {
      cy.get('[data-cy=aprovar]').click();
    });

    cy.wait('@aprovar').its('request.body').should('include', { resultado: 'aprovado' });
  });

  it('exige justificativa ao reprovar (a submissão fica bloqueada sem motivo)', () => {
    abrirFila();
    cy.intercept('POST', '/documentos/doc-1/covalidar', { statusCode: 200, body: { status: 'reprovado' } }).as('reprovar');

    cy.get('[data-cy=doc-pendente]').first().within(() => {
      cy.get('[data-cy=reprovar]').should('be.disabled'); // guarda do cliente (RN003)
      cy.get('[data-cy=motivo]').type('Documento ilegível');
      cy.get('[data-cy=reprovar]').should('not.be.disabled').click();
    });

    cy.wait('@reprovar').its('request.body').should('include', {
      resultado: 'reprovado', justificativa: 'Documento ilegível',
    });
  });
});
