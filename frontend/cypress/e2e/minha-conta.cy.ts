/// <reference types="cypress" />
// E2E (Cypress) — UC018: re-sincronizar dados do CNPJ na tela "Minha conta". API stubada
// (cy.intercept) → determinístico. Hash routing. A rota é protegida: semeamos a sessão
// (token + usuario.empresaId) no localStorage e o perfil vem do GET /fornecedores/:id.

const FID = 'f-123';
const PERFIL = {
  id: FID, cnpj: '11.222.333/0001-81', razaoSocial: 'Confecções Vale do Acre Ltda', porte: 'ME',
  situacao: 'ativa', origem: 'oficial', status: 'requerente', sincronizadoEm: '2026-06-24T09:12:00Z',
  nomeFantasia: 'Vale do Acre', telefone: '(68) 3333-0000',
  endereco: { logradouro: 'Rua Benjamin Constant', numero: '100', bairro: 'Centro', cidade: 'Rio Branco', uf: 'AC', cep: '69900062' },
  cnaes: [{ codigoSubclasse: '1412601', tipo: 'principal', ativo: true }],
};

function entrar(): void {
  cy.intercept('GET', `/fornecedores/${FID}`, { statusCode: 200, body: PERFIL }).as('perfil');
  cy.visit('/#/minha-conta', {
    onBeforeLoad(win) {
      win.localStorage.setItem('compramais.token', 'jwt.mock');
      win.localStorage.setItem('compramais.usuario', JSON.stringify({ userId: 'u1', papel: 'titular', empresaId: FID }));
    },
  });
  cy.wait('@perfil');
}

describe('Minha conta — re-sincronizar CNPJ (UC018)', () => {
  it('carrega o perfil real: dados oficiais + última sincronização + botão', () => {
    entrar();
    cy.contains('Confecções Vale do Acre Ltda').should('be.visible'); // dado oficial do GET (não mock)
    cy.get('[data-cy=card-sync]').should('be.visible');
    cy.get('[data-cy=sync-ultima]').should('be.visible');
    cy.get('[data-cy=sincronizar]').should('be.enabled');
  });

  it('sucesso: sinaliza sucesso e revalida os dados oficiais (RF018)', () => {
    entrar();
    cy.intercept('POST', `/fornecedores/${FID}/sincronizar`, { statusCode: 200, body: { status: 'sucesso', quando: '2026-07-06T09:00:00Z', fonte: 'Receita' } }).as('sinc');
    cy.get('[data-cy=sincronizar]').click();
    cy.wait('@sinc');
    cy.get('[data-cy=sync-sucesso]').should('be.visible');
    cy.get('@perfil.all').its('length').should('be.gte', 2); // GET revalidado após sincronizar
  });

  it('exceção UC018: CNPJ inativo/baixado → sinaliza revisão da CPL', () => {
    entrar();
    cy.intercept('POST', `/fornecedores/${FID}/sincronizar`, { statusCode: 200, body: { status: 'revisao', quando: '2026-07-06T09:00:00Z', fonte: 'Receita' } }).as('sinc');
    cy.get('[data-cy=sincronizar]').click();
    cy.wait('@sinc');
    cy.get('[data-cy=sync-revisao]').should('be.visible');
    cy.get('[data-cy=sync-sucesso]').should('not.exist');
  });

  it('A1: Receita indisponível → sinaliza erro sem apagar a tela', () => {
    entrar();
    cy.intercept('POST', `/fornecedores/${FID}/sincronizar`, { statusCode: 200, body: { status: 'erro' } }).as('sinc');
    cy.get('[data-cy=sincronizar]').click();
    cy.wait('@sinc');
    cy.get('[data-cy=sync-erro]').should('be.visible');
    cy.get('[data-cy=sync-sucesso]').should('not.exist');
  });

  it('salva os campos editáveis (RN009) via PATCH e revalida o perfil', () => {
    entrar();
    cy.intercept('PATCH', `/fornecedores/${FID}`, { statusCode: 204 }).as('patch');
    cy.get('[data-cy=numero]').clear().type('250');
    cy.get('[data-cy=salvar-perfil]').click();
    cy.wait('@patch').its('request.body').should('deep.include', { telefone: '(68) 3333-0000' });
    cy.get('[data-cy=perfil-salvo]').should('be.visible');
    cy.get('@perfil.all').its('length').should('be.gte', 2); // GET revalidado após salvar
  });

  it('sem sessão → redireciona para /cadastro (rota protegida)', () => {
    cy.visit('/#/minha-conta');
    cy.get('[data-cy=aba-entrar]').should('be.visible'); // AuthPanel
  });
});
