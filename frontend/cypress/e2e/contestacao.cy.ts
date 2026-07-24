/// <reference types="cypress" />
// E2E (Cypress) — Tela Única de Contestação/Regularização (UC016 / Épico 7-1):
// o fornecedor vê as pendências consolidadas, com próximo passo, e aciona a regularização.
// A rota é protegida (AD-20) e o fornecedor sai da sessão — sem login real o guard manda ao /cadastro.
import { visitarComo } from '../support/sessao';

describe('Tela Única de Contestação/Regularização (UC016)', () => {
  it('exibe pendências consolidadas com próximo passo e ações', () => {
    cy.intercept('GET', '/fornecedores/*/pendencias-consolidadas', { body: [
      { tipo: 'documento', referenciaId: 'doc-1', motivo: 'ilegível', proximoPasso: 'Reenviar documento' },
      { tipo: 'bloqueio', referenciaId: 'blo-1', motivo: 'débito ativo', proximoPasso: 'Regularizar e reconsultar' },
      { tipo: 'contestacao-cnae', referenciaId: 'con-1', motivo: 'CNAE 1412601', proximoPasso: 'Aguardar análise da Secretaria' },
    ] });
    cy.intercept('GET', '/fornecedores/*', { body: { id: 'demo', cnpj: '11.222.333/0001-81', razaoSocial: 'X', porte: 'ME', situacao: 'ativa', origem: 'oficial', status: 'ativa', sincronizadoEm: null, cnaes: [] } });
    visitarComo('titular', '/#/contestacao');
    cy.get('[data-cy=pendencia]').should('have.length', 3);
    cy.get('[data-cy=acao-reenviar]').should('be.visible');
    cy.get('[data-cy=acao-regularizar]').should('be.visible');
    cy.get('[data-cy=acao-aguardando]').should('be.visible'); // contestação de CNAE: informativa
  });

  it('reenviar documento reprovado delega ao módulo dono (UC006)', () => {
    cy.intercept('GET', '/fornecedores/*/pendencias-consolidadas', { body: [
      { tipo: 'documento', referenciaId: 'doc-1', motivo: 'ilegível', proximoPasso: 'Reenviar documento' },
    ] });
    cy.intercept('GET', '/fornecedores/*', { body: { id: 'demo', cnpj: '11.222.333/0001-81', razaoSocial: 'X', porte: 'ME', situacao: 'ativa', origem: 'oficial', status: 'ativa', sincronizadoEm: null, cnaes: [] } });
    cy.intercept('POST', '/documentos/doc-1/reenviar', { statusCode: 201, body: { status: 'pendente' } }).as('reenviar');
    visitarComo('titular', '/#/contestacao');
    cy.get('[data-cy=acao-reenviar]').click();
    cy.wait('@reenviar');
    cy.get('[data-cy=feedback-acao]').should('be.visible');
  });

  it('estado vazio quando sem pendências', () => {
    cy.intercept('GET', '/fornecedores/*/pendencias-consolidadas', { body: [] });
    cy.intercept('GET', '/fornecedores/*', { body: { id: 'demo', cnpj: '11.222.333/0001-81', razaoSocial: 'X', porte: 'ME', situacao: 'ativa', origem: 'oficial', status: 'ativa', sincronizadoEm: null, cnaes: [] } });
    visitarComo('titular', '/#/contestacao');
    cy.get('[data-cy=sem-pendencias]').should('be.visible');
  });
});
