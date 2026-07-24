/// <reference types="cypress" />
// E2E (Cypress) — consulta e exportação da trilha de auditoria (US1/US2).

describe('Auditoria — consulta e exportação', () => {
  it('consulta filtrada exibe registros', () => {
    cy.intercept('GET', '/auditoria?*', { body: [
      { id: 'a1', usuario: 'cpl1', evento: 'DocumentoReprovado', timestamp: '2026-03-01T10:00:00Z', ip: null },
    ] });
    cy.visit('/#/admin/auditoria');
    cy.get('[data-cy=evento]').type('DocumentoReprovado');
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=registro]').should('have.length', 1);
  });

  it('mostra erro de intervalo inválido (400)', () => {
    cy.intercept('GET', '/auditoria?*', { statusCode: 400, body: { codigo: 'IntervaloInvalido' } });
    cy.visit('/#/admin/auditoria');
    cy.get('[data-cy=de]').type('2026-05-01');
    cy.get('[data-cy=ate]').type('2026-01-01');
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=erro]').should('be.visible');
  });

  it('exporta CSV via fetch (não navega para fora da SPA)', () => {
    cy.intercept('GET', '/auditoria?*', { body: [] });
    // A rota de exportação é protegida por RBAC: o download precisa ser um fetch com cabeçalhos,
    // não uma navegação de página (que responderia 403). O intercept prova que a requisição ocorre.
    cy.intercept('GET', '/auditoria/exportar?*', {
      headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="auditoria.csv"' },
      body: 'id,usuario,evento,timestamp,ip,payload',
    }).as('export');
    cy.visit('/#/admin/auditoria');
    cy.get('[data-cy=fornecedor]').type('CNPJ-9');
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=exportar-csv]').click();
    cy.wait('@export').its('request.url').should('include', 'formato=csv').and('include', 'fornecedorId=CNPJ-9');
    cy.location('hash').should('eq', '#/admin/auditoria'); // permaneceu na SPA
  });
});
