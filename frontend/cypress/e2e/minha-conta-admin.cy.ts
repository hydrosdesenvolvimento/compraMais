/// <reference types="cypress" />
import { visitarComo } from '../support/sessao';

/**
 * "Minha conta" do servidor (Painel Admin): dados do módulo Usuários exibidos READ-ONLY + self-service
 * de senha. O perfil é servido por GET /auth/perfil (aqui stubado para asserção determinística).
 */
const PERFIL = {
  userId: 'u1', email: 'silas.carvalho@riobranco.ac.gov.br', nome: 'Silas Carvalho', avatar: null,
  papel: 'cpl', cargo: 'analista_cpl', secretaria: 'CPL', ativo: true, registerDate: '2025-02-12T00:00:00Z',
};

describe('Minha conta (Painel Admin)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/auth/perfil', { body: PERFIL }).as('perfil');
    cy.intercept('GET', '/catalogos/secretarias*', { body: [] });
  });

  it('mostra os dados do servidor (read-only) e abre a troca de senha', () => {
    visitarComo('administrador', '/#/admin/minha-conta');
    cy.get('[data-cy=minha-conta-admin]').should('be.visible');
    cy.contains('silas.carvalho@riobranco.ac.gov.br');
    cy.contains('Analista CPL'); // cargo (analista_cpl) / perfil (cpl) localizados
    cy.contains('Ativo'); // situação (ativo = true)

    cy.get('[data-cy=abrir-troca-senha]').click();
    cy.get('[data-cy=senha-atual]').should('be.visible');
    cy.get('[data-cy=salvar-senha]').should('exist');
  });
});
