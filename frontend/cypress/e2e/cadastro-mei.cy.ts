/// <reference types="cypress" />

/**
 * Autocadastro do fornecedor com declaração de MEI (UC001). A Receita subclassifica o MEI como ME; a
 * autodeclaração vai como `porteDeclarado` e tem precedência. Fluxo público, sem login.
 */
describe('Autocadastro — declaração de MEI', () => {
  it('declarar MEI reflete no porte e envia porteDeclarado=MEI no cadastro', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', {
      body: { valor: { razaoSocial: 'Costura Maria', porte: 'ME', situacaoCadastral: 'ativa', cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal' }], endereco: { logradouro: 'Rua A', numero: '100', complemento: '', bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062' } } },
    }).as('cnpj');
    cy.intercept('POST', '/fornecedores', { statusCode: 201, body: { fornecedorId: 'f1', status: 'requerente', origem: 'oficial' } }).as('cadastrar');
    cy.intercept('POST', '/auth/login', { body: { token: 't', expiraEm: 1, usuario: { userId: 'u1', papel: 'titular', empresaId: 'f1' } } });

    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]').click();
    cy.get('[data-cy=cnpj]').type('11222333000181');
    cy.get('[data-cy=consultar]').click();
    cy.wait('@cnpj');

    cy.get('[data-cy=porte-valor]').should('contain', 'ME');
    cy.get('[data-cy=declarar-mei]').check();
    cy.get('[data-cy=porte-valor]').should('contain', 'MEI');

    cy.get('[data-cy=email-cadastro]').type('maria@costura.com');
    cy.get('[data-cy=senha-cadastro]').type('segredo12');
    cy.get('[data-cy=consentimento]').click();
    cy.get('[data-cy=criar-conta]').click();

    cy.wait('@cadastrar').its('request.body.porteDeclarado').should('eq', 'MEI');
  });
});
