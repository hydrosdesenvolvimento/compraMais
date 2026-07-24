/**
 * UC020 — disposição dos campos da tela "Catálogos" (`/#/admin/catalogos`).
 *
 * Verifica no navegador real o que o teste de componente (jsdom) não alcança: **layout**. O formulário
 * era uma coluna de 480px que deixava metade do cartão vazia; passou a usar a grade de duas colunas do
 * Design System (`.cm-form-grid`), com os campos longos ocupando a linha inteira (`.cm-campo-total`).
 *
 * Autentica pelo perfil SMGA — é o dono da tela por padrão (`VISIBILIDADE_PADRAO.smga`). Requer o stack
 * no ar (`docker compose --profile dev`) com o seed aplicado.
 */
const SMGA = { email: 'smga@compramais.local', senha: 'smga123456' };

/** Duas caixas estão na mesma linha quando seus topos coincidem (tolerância de 2px de arredondamento). */
function mesmaLinha(a: DOMRect, b: DOMRect): boolean {
  return Math.abs(a.top - b.top) <= 2;
}

describe('Catálogos — disposição dos campos', () => {
  beforeEach(() => {
    cy.request('POST', '/auth/login', SMGA).then((r) => {
      window.localStorage.setItem('compramais.token', r.body.token);
      window.localStorage.setItem('compramais.usuario', JSON.stringify(r.body.usuario));
    });
    cy.visit('/#/admin/catalogos');
    cy.get('[data-cy=form-catalogo]').should('be.visible');
  });

  it('o formulário usa a grade de duas colunas e ocupa a largura útil do cartão', () => {
    cy.get('[data-cy=form-catalogo]')
      .should('have.class', 'cm-form-grid')
      .then(($f) => {
        expect($f[0].getBoundingClientRect().width, 'largura do formulário').to.be.greaterThan(600);
        expect(getComputedStyle($f[0]).gridTemplateColumns.split(' ')).to.have.length(2);
      });
  });

  it('Materiais e serviços: Natureza e Unidades dividem a linha; Nome e Especificações ocupam a linha inteira', () => {
    cy.get('[data-cy=tab-materiais-servicos]').click();
    cy.get('[data-cy=campo-especificacoes]').should('be.visible');

    cy.get('[data-cy=campo-tipo]').then(($tipo) => {
      cy.get('[data-cy=campo-unidades]').then(($un) => {
        const t = $tipo[0].getBoundingClientRect();
        const u = $un[0].getBoundingClientRect();
        expect(mesmaLinha(t, u), 'Natureza e Unidades na mesma linha').to.equal(true);
        expect(u.left, 'Unidades à direita de Natureza').to.be.greaterThan(t.left);
      });
    });

    // Campos longos: ocupam as duas colunas (largura ≈ a do formulário).
    cy.get('[data-cy=form-catalogo]').then(($f) => {
      const formW = $f[0].getBoundingClientRect().width;
      cy.get('[data-cy=campo-nome]').should(($el) => {
        expect($el[0].getBoundingClientRect().width).to.be.greaterThan(formW * 0.9);
      });
      cy.get('[data-cy=campo-especificacoes]').should(($el) => {
        expect($el[0].getBoundingClientRect().width).to.be.greaterThan(formW * 0.9);
      });
    });

    cy.screenshot('catalogos-materiais-servicos', { capture: 'viewport', overwrite: true });
  });

  it('Tipos de documento: os dois booleanos ficam lado a lado, com a caixa alinhada ao rótulo', () => {
    cy.get('[data-cy=tab-tipos-documento]').click();
    cy.get('[data-cy=campo-exigeValidade]').should('be.visible');

    cy.get('[data-cy=campo-exigeValidade]').then(($a) => {
      cy.get('[data-cy=campo-exigeExercicio]').then(($b) => {
        expect(mesmaLinha($a[0].getBoundingClientRect(), $b[0].getBoundingClientRect()), 'booleanos na mesma linha').to.equal(true);
      });
    });

    // Caixa e rótulo centrados entre si (antes o rótulo ficava acima, deixando a caixinha órfã).
    cy.get('[data-cy=campo-exigeValidade]').parent().then(($label) => {
      const caixa = $label.find('input')[0].getBoundingClientRect();
      const texto = $label.find('span')[0].getBoundingClientRect();
      expect(Math.abs((caixa.top + caixa.height / 2) - (texto.top + texto.height / 2)), 'caixa alinhada ao rótulo').to.be.lessThan(4);
    });

    cy.screenshot('catalogos-tipos-documento', { capture: 'viewport', overwrite: true });
  });

  it('colapsa em coluna única no viewport estreito (≤920px)', () => {
    cy.viewport(800, 900);
    cy.get('[data-cy=tab-materiais-servicos]').click();
    cy.get('[data-cy=campo-tipo]').then(($tipo) => {
      cy.get('[data-cy=campo-unidades]').then(($un) => {
        expect(mesmaLinha($tipo[0].getBoundingClientRect(), $un[0].getBoundingClientRect()), 'empilhados no mobile').to.equal(false);
      });
    });
  });
});
