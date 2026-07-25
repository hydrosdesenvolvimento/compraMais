/// <reference types="cypress" />
import { visitarComo } from '../support/sessao';

/** Data ISO a N dias de hoje (para o alerta de edital a vencer). */
const emDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const FUNIL = {
  documentosPendentes: 2,
  editaisPorSituacao: { rascunho: 3, publicado: 4, encerrado: 5 },
  bloqueiosAtivos: 1,
  fornecedoresAtivos: 87,
  fornecedoresMei: 37,
  valorEstimado: 2_840_000,
  editaisEmAndamento: [
    { id: 'e1', numero: 'ED-2026/001', objeto: 'Fardamento escolar', secretariaId: 's1', prazoVigencia: emDias(10), credenciados: 4, valorEstimado: 1_500_000 },
    { id: 'e2', numero: 'ED-2026/002', objeto: 'Mobiliário escolar', secretariaId: 's1', prazoVigencia: null, credenciados: 3, valorEstimado: 1_340_000 },
  ],
};

describe('Painel administrativo · Visão geral (dashboard)', () => {
  beforeEach(() => {
    cy.intercept('GET', '/admin/dashboard', { body: FUNIL }).as('funil');
    cy.intercept('GET', '/catalogos/secretarias*', { body: [{ id: 's1', sigla: 'SEME', ativo: true, situacao: 'ativo' }] });
  });

  it('mostra os 4 KPIs, os editais em andamento e os alertas', () => {
    visitarComo('administrador', '/#/admin/dashboard');
    cy.get('[data-cy=admin-dashboard]').should('be.visible');
    cy.get('[data-cy=card]').should('have.length', 4);
    cy.contains('[data-cy=card]', '12'); // total de demandas = 3+4+5
    cy.contains('[data-cy=card]', '87'); // fornecedores ativos
    cy.get('[data-cy=editais-andamento]').should('contain', 'ED-2026/001');
    // bloqueios (1) + documentos pendentes (2) + 1 edital a vencer (prazo em 10 dias) = 3 alertas
    cy.get('[data-cy=alertas] [data-cy=alerta]').should('have.length', 3);
  });

  it('o sino da topbar reflete os mesmos alertas operacionais', () => {
    visitarComo('administrador', '/#/admin/dashboard');
    cy.get('[data-cy=notif-alerta]').should('exist'); // ponto de alerta no sino
    cy.get('[data-cy=notificacoes]').click();
    cy.get('[data-cy=notif-item]').should('have.length.greaterThan', 0);
  });
});
