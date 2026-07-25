/// <reference types="cypress" />

/**
 * Portal público de Transparência (RN007) — BI aberto ao cidadão, SEM login: investimento na economia
 * local, KPIs (fornecedores/editais/% MEI), investimento por secretaria e participação por porte.
 */
const BI = {
  editaisVigentes: 12,
  secretarias: ['s1'],
  segmentos: ['1412601', '3101200'],
  fornecedoresAtivos: 87,
  meiPercentual: 42,
  investimentoTotal: 2_840_000,
  investimentoPorSecretaria: [
    { secretaria: 'SEME', valor: 2_000_000 },
    { secretaria: 'SEMSA', valor: 840_000 },
  ],
  participacaoPorPorte: [
    { porte: 'MEI', fornecedores: 37 },
    { porte: 'ME', fornecedores: 30 },
    { porte: 'EPP', fornecedores: 20 },
  ],
};

describe('Portal da Transparência · BI público (RN007)', () => {
  it('mostra investimento, KPIs e recortes por secretaria/porte — sem login', () => {
    cy.intercept('GET', '/transparencia', { body: BI }).as('bi');
    // O shell do fornecedor carrega o catálogo de secretarias mesmo anônimo — stub evita 401/redirect.
    cy.intercept('GET', '/catalogos/secretarias*', { body: [] });
    cy.visit('/#/transparencia');

    cy.wait('@bi');
    cy.get('[data-cy=investimento-total]').should('be.visible');
    cy.get('[data-cy=kpi-fornecedores]').should('contain', '87');
    cy.get('[data-cy=kpi-editais]').should('contain', '12');
    cy.get('[data-cy=kpi-mei]').should('contain', '42%');
    cy.get('[data-cy=investimento-secretaria]').should('have.length', 2);
    cy.contains('[data-cy=investimento-secretaria]', 'SEME');
    cy.get('[data-cy=participacao-porte]').should('have.length', 3);
  });
});
