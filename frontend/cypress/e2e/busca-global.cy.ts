/// <reference types="cypress" />
import { visitarComo } from '../support/sessao';

/**
 * Busca global da topbar (editais/documentos/fornecedores). O Admin consulta os três domínios; o
 * resultado é agrupado por tipo e o clique navega para a tela do domínio já filtrada.
 */
describe('Busca global da topbar (Admin)', () => {
  const TELAS = ['painel', 'fornecedores', 'gestaoEditais', 'credenciamento', 'analiseDocumental', 'distribuicao', 'cadastroReserva', 'desistencias', 'malote', 'contestacoes', 'catalogos', 'secretarias', 'setoresIndustriais', 'tiposArquivos', 'usuarios', 'lgpd', 'auditoria', 'perfis', 'covalidacao'];

  beforeEach(() => {
    // Telas visíveis determinísticas: a guarda de rota (exigirTelaAdmin) usa este cache; sem gestaoEditais
    // visível, o clique no resultado de edital redirigiria para a home do admin.
    cy.intercept('GET', '/permissoes/telas/me', { body: { papel: 'administrador', telas: TELAS } });
    cy.intercept('GET', '/catalogos/secretarias*', { body: [{ id: 's1', sigla: 'SEME', ativo: true, situacao: 'ativo' }] });
    cy.intercept('GET', '/gestao/editais*', {
      body: { items: [{ id: 'e1', numero: 'ED-2026/014', objeto: 'Fardamento escolar', secretariaId: 's1', situacao: 'publicado', cnaesAlvo: ['1412601'], prazoVigencia: null, qtdItens: 2 }], total: 1, page: 1, size: 5 },
    }).as('editais');
    cy.intercept('GET', '/admin/fornecedores*', {
      body: { itens: [{ id: 'f1', cnpj: '12.345.678/0001-90', razaoSocial: 'Malharia Maria', nomeFantasia: 'Malharia Maria', porte: 'ME', cnaePrincipal: '1412601', situacao: 'ativa', status: 'requerente', sincronizadoEm: null }], total: 1, pagina: 1, tamanho: 5 },
    }).as('forn');
    cy.intercept('GET', '/documentos/analise', { body: [] });
  });

  it('busca editais e navega para a gestão ao clicar num resultado', () => {
    visitarComo('administrador', '/#/admin/dashboard');
    cy.get('[data-cy=busca]').type('fardamento');
    cy.get('[data-cy=busca-resultados]').should('be.visible');
    cy.get('[data-cy=busca-grupo-editais]').should('exist')
      .find('[data-cy=busca-item]').first()
      .should('contain', 'ED-2026/014')
      .click();
    cy.hash().should('include', '/admin/editais');
  });
});
