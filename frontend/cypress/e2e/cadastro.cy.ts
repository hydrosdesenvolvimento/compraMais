/// <reference types="cypress" />
// E2E (Cypress) — fluxo de cadastro do fornecedor (US1): consulta de CNPJ (autofill + QSA),
// autofill de endereço por CEP e fallback manual. API stubada (cy.intercept) → determinístico.
// A SPA usa hash routing: navega por '/#/cadastro'. Execução real (browser) fica com o QA.

const CNPJ_OK = {
  valor: {
    razaoSocial: 'Confecções Vale do Acre Ltda',
    porte: 'ME',
    situacaoCadastral: 'ativa',
    cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal' }],
    socios: [
      { nome: 'Marcos Albuquerque', qualificacao: 'Sócio-Administrador', documento: '***550179**' },
      { nome: 'Ana Paula Souza', qualificacao: 'Sócia', documento: '***881234**' },
    ],
  },
  fonte: 'Receita', timestamp: '2026-06-30T00:00:00Z', frescor: 'verificado',
};
const CEP_OK = {
  valor: { cep: '69900062', estado: 'AC', cidade: 'Rio Branco', bairro: 'Centro', rua: 'Rua Benjamin Constant' },
  fonte: 'BrasilAPI', timestamp: '2026-06-30T00:00:00Z', frescor: 'verificado',
};

const CNPJ_TESTE = '12345678000190';

describe('Cadastro do fornecedor (US1) — CNPJ → QSA → CEP', () => {
  it('consulta o CNPJ e autopreenche razão social, porte, situação e o QSA (sócios)', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 200, body: CNPJ_OK }).as('cnpj');
    cy.visit('/#/cadastro');
    cy.get('[data-cy=cnpj]').type(CNPJ_TESTE);
    cy.get('[data-cy=consultar]').click();
    cy.wait('@cnpj');

    cy.get('[data-cy=razao-social]').should('have.value', 'Confecções Vale do Acre Ltda');
    cy.get('[data-cy=socio]').should('have.length', 2);
    cy.get('[data-cy=socio]').first().should('contain', 'Marcos Albuquerque').and('contain', 'Sócio-Administrador');
  });

  it('autopreenche o endereço pelo CEP (BrasilAPI)', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 200, body: CNPJ_OK });
    cy.intercept('GET', '/fornecedores/consulta-cep/*', { statusCode: 200, body: CEP_OK }).as('cep');
    cy.visit('/#/cadastro');
    cy.get('[data-cy=cnpj]').type(CNPJ_TESTE);
    cy.get('[data-cy=consultar]').click();

    cy.get('[data-cy=cep]').type('69900062');
    cy.wait('@cep');
    cy.get('[data-cy=endereco]').should('contain', 'Rio Branco').and('contain', 'AC');
  });

  it('exibe fallback manual quando a Receita está indisponível (503)', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 503, body: { frescor: 'indisponivel' } });
    cy.visit('/#/cadastro');
    cy.get('[data-cy=cnpj]').type(CNPJ_TESTE);
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=preencher-manual]').should('be.visible');
    cy.get('[data-cy=razao-social]').should('not.exist');
  });

  it('sinaliza quando o CEP não é encontrado (404)', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 200, body: CNPJ_OK });
    cy.intercept('GET', '/fornecedores/consulta-cep/*', { statusCode: 404, body: { codigo: 'CEP_NAO_ENCONTRADO' } });
    cy.visit('/#/cadastro');
    cy.get('[data-cy=cnpj]').type(CNPJ_TESTE);
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=cep]').type('00000000');
    cy.contains('CEP não encontrado').should('be.visible');
  });
});
