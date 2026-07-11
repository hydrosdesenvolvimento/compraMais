/// <reference types="cypress" />
// E2E (Cypress) — portal público de transparência (UC011 / RN013): agregados não-identificáveis + filtro por período (A1).

const agregados = {
  editaisVigentes: 3,
  secretarias: ['SEMSA', 'SME'],
  segmentos: ['1091101', '3101200'],
  periodo: { de: null as string | null, ate: null as string | null },
};

describe('Portal público de transparência (UC011)', () => {
  it('mostra os agregados públicos (editais vigentes, secretarias, segmentos) sem login', () => {
    cy.intercept('GET', '/transparencia', { body: agregados }).as('agregados');
    cy.visit('/#/transparencia');
    cy.wait('@agregados');
    cy.get('[data-cy=editais-vigentes]').should('contain.text', '3');
    cy.get('[data-cy=secretaria]').should('have.length', 2).first().should('contain.text', 'SEMSA');
    cy.get('[data-cy=segmento]').should('have.length', 2);
  });

  it('filtra por período (A1): envia de/ate na consulta', () => {
    cy.intercept('GET', '/transparencia*', { body: agregados }).as('consulta');
    cy.visit('/#/transparencia');
    cy.wait('@consulta');

    cy.get('[data-cy=filtro-de]').type('2026-06-01');
    cy.get('[data-cy=filtro-ate]').type('2026-07-31');
    cy.get('[data-cy=filtro-aplicar]').click();

    cy.wait('@consulta').its('request.url').should('include', 'de=2026-06-01').and('include', 'ate=2026-07-31');
    cy.get('[data-cy=filtro-limpar]').should('be.visible');
  });
});
