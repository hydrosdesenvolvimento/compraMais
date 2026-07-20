/// <reference types="cypress" />
// E2E (Cypress) — UC015: autenticar e gerir a própria senha. API stubada (cy.intercept) →
// determinístico, hash routing. Cobre A2 (troca autenticada em "Minha conta") e A1 (esqueci +
// redefinir com token). As rotas do backend são exercitadas de verdade nos testes de integração.

const FID = 'f-123';
const PERFIL = {
  id: FID, cnpj: '11.222.333/0001-81', razaoSocial: 'Confecções Vale do Acre Ltda', porte: 'ME',
  situacao: 'ativa', origem: 'oficial', status: 'requerente', sincronizadoEm: '2026-06-24T09:12:00Z',
  nomeFantasia: 'Vale do Acre', telefone: '(68) 3333-0000',
  endereco: { logradouro: 'Rua Benjamin Constant', numero: '100', bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062' },
  cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal', ativo: true }],
};

function entrarMinhaConta(): void {
  cy.intercept('GET', `/fornecedores/${FID}`, { statusCode: 200, body: PERFIL }).as('perfil');
  cy.visit('/#/minha-conta', {
    onBeforeLoad(win) {
      win.localStorage.setItem('compramais.token', 'jwt.mock');
      win.localStorage.setItem('compramais.usuario', JSON.stringify({ userId: 'u1', papel: 'titular', empresaId: FID }));
    },
  });
  cy.wait('@perfil');
}

describe('UC015 · A2 — trocar a própria senha (Minha conta)', () => {
  it('sucesso: senha atual + nova + confirmação → 204 → mensagem de sucesso', () => {
    entrarMinhaConta();
    cy.intercept('POST', '/auth/senha', { statusCode: 204 }).as('troca');
    cy.get('[data-cy=abrir-troca-senha]').click();
    cy.get('[data-cy=senha-atual]').type('segredo12');
    cy.get('[data-cy=senha-nova]').type('novaSenha34');
    cy.get('[data-cy=senha-confirma]').type('novaSenha34');
    cy.get('[data-cy=salvar-senha]').click();
    cy.wait('@troca').its('request.body').should('deep.equal', { senhaAtual: 'segredo12', novaSenha: 'novaSenha34' });
    cy.get('[data-cy=senha-sucesso]').should('be.visible');
  });

  it('senha atual incorreta → 400 → erro específico, sem sucesso', () => {
    entrarMinhaConta();
    cy.intercept('POST', '/auth/senha', { statusCode: 400, body: { codigo: 'SenhaAtualIncorreta', mensagem: 'Current password is incorrect.' } }).as('troca');
    cy.get('[data-cy=abrir-troca-senha]').click();
    cy.get('[data-cy=senha-atual]').type('errada000');
    cy.get('[data-cy=senha-nova]').type('novaSenha34');
    cy.get('[data-cy=senha-confirma]').type('novaSenha34');
    cy.get('[data-cy=salvar-senha]').click();
    cy.wait('@troca');
    cy.get('[data-cy=senha-erro]').should('contain', 'Senha atual incorreta');
    cy.get('[data-cy=senha-sucesso]').should('not.exist');
  });

  it('confirmação divergente → erro local, sem chamar a API', () => {
    entrarMinhaConta();
    cy.intercept('POST', '/auth/senha', cy.spy().as('troca'));
    cy.get('[data-cy=abrir-troca-senha]').click();
    cy.get('[data-cy=senha-atual]').type('segredo12');
    cy.get('[data-cy=senha-nova]').type('novaSenha34');
    cy.get('[data-cy=senha-confirma]').type('diferente99');
    cy.get('[data-cy=salvar-senha]').click();
    cy.get('[data-cy=senha-erro]').should('be.visible');
    cy.get('@troca').should('not.have.been.called');
  });
});

describe('UC015 · A1 — esqueci a senha', () => {
  it('solicita o link e mostra a confirmação genérica (não revela conta)', () => {
    cy.intercept('POST', '/auth/senha/esqueci', { statusCode: 204 }).as('esqueci');
    cy.visit('/#/cadastro');
    cy.get('[data-cy=aba-entrar]').click();
    cy.get('[data-cy=esqueci-senha]').click();
    cy.get('[data-cy=reset-email]').type('alguem@empresa.com');
    cy.get('[data-cy=reset-enviar]').click();
    cy.wait('@esqueci').its('request.body').should('deep.equal', { email: 'alguem@empresa.com' });
    cy.get('[data-cy=reset-enviado]').should('be.visible');
  });
});

describe('UC015 · A1 — redefinir com token', () => {
  it('token válido → 204 → sucesso e caminho para o login', () => {
    cy.intercept('POST', '/auth/senha/redefinir', { statusCode: 204 }).as('redefinir');
    cy.visit('/#/redefinir-senha?token=tok-valido');
    cy.get('[data-cy=redefinir-nova]').type('novaSenha34');
    cy.get('[data-cy=redefinir-confirma]').type('novaSenha34');
    cy.get('[data-cy=redefinir-enviar]').click();
    cy.wait('@redefinir').its('request.body').should('deep.equal', { token: 'tok-valido', novaSenha: 'novaSenha34' });
    cy.get('[data-cy=redefinir-sucesso]').should('be.visible');
    cy.get('[data-cy=redefinir-ir-login]').click();
    cy.get('[data-cy=aba-entrar]').should('be.visible'); // voltou ao AuthPanel
  });

  it('token inválido/expirado → 400 → mensagem genérica', () => {
    cy.intercept('POST', '/auth/senha/redefinir', { statusCode: 400, body: { codigo: 'TokenResetInvalido', mensagem: 'Invalid or expired reset token.' } }).as('redefinir');
    cy.visit('/#/redefinir-senha?token=expirado');
    cy.get('[data-cy=redefinir-nova]').type('novaSenha34');
    cy.get('[data-cy=redefinir-confirma]').type('novaSenha34');
    cy.get('[data-cy=redefinir-enviar]').click();
    cy.wait('@redefinir');
    cy.get('[data-cy=redefinir-erro]').should('be.visible');
    cy.get('[data-cy=redefinir-sucesso]').should('not.exist');
  });

  it('sem token na URL → estado de link inválido', () => {
    cy.visit('/#/redefinir-senha');
    cy.get('[data-cy=redefinir-sem-token]').should('be.visible');
  });
});
