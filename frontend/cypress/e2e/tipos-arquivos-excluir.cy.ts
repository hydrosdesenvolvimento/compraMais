/**
 * RF022 / UC020 — exclusão definitiva de tipo de arquivo em `/#/admin/tipos-arquivos`.
 *
 * Cobre no navegador real o que o teste de componente (jsdom) não alcança: o caminho ponta a ponta
 * contra a API — quem vê a lixeira, o que o backend recusa (409) e o que ele de fato apaga. A exclusão
 * é restrita ao Administrador; a Secretaria (`smga`), dona das demais escritas do catálogo, não a vê.
 *
 * Requer o stack no ar (`docker compose --profile dev`) com o seed aplicado.
 */
const ADMIN = { email: 'administrador@compramais.local', senha: 'admin12345' };
const SMGA = { email: 'smga@compramais.local', senha: 'smga123456' };

/** Tipo de sistema (prova de vida, UC007) — o backend nunca permite excluí-lo. */
const TIPO_DE_SISTEMA = 'Foto do Responsável';

function autenticar(credenciais: { email: string; senha: string }): void {
  cy.request('POST', '/auth/login', credenciais).then((r) => {
    window.localStorage.setItem('compramais.token', r.body.token);
    window.localStorage.setItem('compramais.usuario', JSON.stringify(r.body.usuario));
  });
}

/** Linha da tabela cujo nome do documento é exatamente `nome`. */
function linhaDoTipo(nome: string) {
  return cy.contains('[data-cy=item-tipo] td', new RegExp(`^${nome}$`)).parents('[data-cy=item-tipo]');
}

describe('Tipos de Arquivos — exclusão definitiva (RF022)', () => {
  it('Administrador cria, inativa e exclui um tipo; a linha some da tabela', () => {
    const nome = `Certidão E2E ${Date.now()}`;
    autenticar(ADMIN);
    cy.visit('/#/admin/tipos-arquivos');
    cy.get('[data-cy=tabela-tipos]').should('be.visible');

    // Cria pelo modal da própria tela (mesmo caminho do usuário).
    cy.get('[data-cy=novo-cadastro]').click();
    cy.get('[data-cy=campo-nome]').type(nome);
    cy.get('[data-cy=campo-formato]').type('pdf');
    cy.get('[data-cy=campo-categoria]').select('cadastral');
    cy.get('[data-cy=salvar-tipo]').click();
    linhaDoTipo(nome).should('exist');

    // Ativo ainda não pode ser excluído: a lixeira nasce desabilitada, com o tooltip explicando.
    linhaDoTipo(nome).find('[data-cy=excluir]')
      .should('be.disabled')
      .and('have.attr', 'title', 'Inative o tipo antes de excluir');

    // Inativa e então exclui.
    linhaDoTipo(nome).find('[data-cy=alternar-situacao]').click();
    linhaDoTipo(nome).find('[data-cy=status]').should('contain.text', 'Inativo');
    linhaDoTipo(nome).find('[data-cy=excluir]').click();
    cy.get('[data-cy=toast][data-tom=ok]').should('be.visible');
    cy.contains('[data-cy=item-tipo] td', new RegExp(`^${nome}$`)).should('not.exist');
  });

  it('tipo de sistema (Foto do Responsável) é recusado pelo servidor mesmo depois de inativado', () => {
    autenticar(ADMIN);
    cy.visit('/#/admin/tipos-arquivos');
    cy.get('[data-cy=tabela-tipos]').should('be.visible');

    // Inativar habilita a lixeira na UI; a guarda que sobra é a do backend, que é a que importa aqui.
    linhaDoTipo(TIPO_DE_SISTEMA).find('[data-cy=alternar-situacao]').click();
    linhaDoTipo(TIPO_DE_SISTEMA).find('[data-cy=status]').should('contain.text', 'Inativo');
    linhaDoTipo(TIPO_DE_SISTEMA).find('[data-cy=excluir]').should('be.enabled').click();
    cy.get('[data-cy=toast][data-tom=erro]').should('be.visible');
    linhaDoTipo(TIPO_DE_SISTEMA).should('exist');

    // Restaura o catálogo: a prova de vida (UC007) depende deste tipo ATIVO.
    linhaDoTipo(TIPO_DE_SISTEMA).find('[data-cy=alternar-situacao]').click();
    linhaDoTipo(TIPO_DE_SISTEMA).find('[data-cy=status]').should('contain.text', 'Ativo');
  });

  it('Secretaria (smga) não vê a lixeira, mas continua podendo editar e inativar', () => {
    autenticar(SMGA);
    cy.visit('/#/admin/tipos-arquivos');
    cy.get('[data-cy=tabela-tipos]').should('be.visible');

    cy.get('[data-cy=excluir]').should('not.exist');
    cy.get('[data-cy=editar]').should('exist');
    cy.get('[data-cy=alternar-situacao]').should('exist');
  });
});
