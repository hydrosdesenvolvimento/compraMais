/// <reference types="cypress" />
// E2E (Cypress) — cadastro do fornecedor (US1): CNPJ (autofill + QSA + endereço), autofill por CEP,
// fallback manual; e LOGIN local (JWT). API stubada (cy.intercept) → determinístico. Hash routing.

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
    endereco: { logradouro: 'Rua Benjamin Constant', numero: '100', complemento: '', bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062' },
  },
  fonte: 'Receita', timestamp: '2026-06-30T00:00:00Z', frescor: 'verificado',
};
const CEP_OK = {
  valor: { cep: '01001000', estado: 'SP', cidade: 'São Paulo', bairro: 'Sé', rua: 'Praça da Sé' },
  fonte: 'BrasilAPI', timestamp: '2026-06-30T00:00:00Z', frescor: 'verificado',
};
const CNPJ_TESTE = '11222333000181';

describe('Cadastro do fornecedor (US1) — CNPJ → QSA → endereço → CEP', () => {
  it('consulta o CNPJ e autopreenche razão social, porte, situação, QSA e endereço', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 200, body: CNPJ_OK }).as('cnpj');
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]').click(); // login é a aba padrão; abre "Criar conta"
    cy.get('[data-cy=cnpj]').type(CNPJ_TESTE);
    cy.get('[data-cy=consultar]').click();
    cy.wait('@cnpj');

    cy.get('[data-cy=razao-social]').should('have.value', 'Confecções Vale do Acre Ltda');
    cy.get('[data-cy=socio]').should('have.length', 2);
    cy.get('[data-cy=endereco-empresa]').invoke('val').should('include', 'Rio Branco').and('include', 'AC');
    // CEP preenchido a partir do CNPJ; número/complemento editáveis pela empresa
    cy.get('[data-cy=cep]').should('have.value', '69900-062');
    cy.get('[data-cy=numero]').should('not.be.disabled').clear().type('250').should('have.value', '250');
    cy.get('[data-cy=complemento]').should('not.be.disabled').type('Sala 3').should('have.value', 'Sala 3');
  });

  it('substitui o logradouro ao consultar outro CEP (BrasilAPI)', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 200, body: CNPJ_OK });
    cy.intercept('GET', '/fornecedores/consulta-cep/*', { statusCode: 200, body: CEP_OK }).as('cep');
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]').click(); // login é a aba padrão; abre "Criar conta"
    cy.get('[data-cy=cnpj]').type(CNPJ_TESTE);
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=cep]').clear().type('01001000');
    cy.wait('@cep');
    cy.get('[data-cy=endereco-empresa]').invoke('val').should('include', 'São Paulo').and('include', 'SP');
  });

  it('conclui o cadastro (UC001): cria conta, autentica e entra no portal', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 200, body: CNPJ_OK });
    cy.intercept('POST', '/fornecedores', { statusCode: 201, body: { fornecedorId: 'f1', status: 'requerente', origem: 'oficial' } }).as('cadastro');
    cy.intercept('POST', '/auth/login', { statusCode: 200, body: { token: 'jwt.mock', expiraEm: 3600, usuario: { userId: 'u1', papel: 'titular' } } }).as('login');
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]').click(); // login é a aba padrão; abre "Criar conta"
    cy.get('[data-cy=cnpj]').type(CNPJ_TESTE);
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=email-cadastro]').type('lojista@empresa.com');
    cy.get('[data-cy=senha-cadastro]').type('segredo12');
    cy.get('[data-cy=criar-conta]').should('be.disabled'); // consentimento obrigatório
    cy.get('[data-cy=consentimento]').click();
    cy.get('[data-cy=criar-conta]').click();
    cy.wait('@cadastro');
    cy.wait('@login');
    cy.get('[data-cy=app-shell]').should('exist');
  });

  it('exibe fallback manual quando a Receita está indisponível (503)', () => {
    cy.intercept('POST', '/fornecedores/consulta-cnpj', { statusCode: 503, body: { frescor: 'indisponivel' } });
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-criar]').click(); // login é a aba padrão; abre "Criar conta"
    cy.get('[data-cy=cnpj]').type(CNPJ_TESTE);
    cy.get('[data-cy=consultar]').click();
    cy.get('[data-cy=preencher-manual]').should('be.visible');
    cy.get('[data-cy=razao-social]').should('not.exist');
  });
});

describe('Login local (US1 / FR-015)', () => {
  it('entra com e-mail e senha e navega para o portal', () => {
    cy.intercept('POST', '/auth/login', { statusCode: 200, body: { token: 'jwt.mock', expiraEm: 3600, usuario: { userId: 'u1', papel: 'titular' } } }).as('login');
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-entrar]').click();
    cy.get('[data-cy=email]').type('lojista@empresa.com');
    cy.get('[data-cy=senha]').type('segredo12');
    cy.get('[data-cy=entrar]').click();
    cy.wait('@login');
    cy.get('[data-cy=app-shell]').should('exist'); // navegou para /inicio (shell do fornecedor)
  });

  it('mostra erro em credenciais inválidas (401)', () => {
    cy.intercept('POST', '/auth/login', { statusCode: 401, body: { codigo: 'CredenciaisInvalidas' } });
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-entrar]').click();
    cy.get('[data-cy=email]').type('x@y.com');
    cy.get('[data-cy=senha]').type('errada00');
    cy.get('[data-cy=entrar]').click();
    cy.get('[data-cy=login-erro]').should('be.visible');
  });
});
