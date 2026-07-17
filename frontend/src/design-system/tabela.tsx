import type { CSSProperties } from 'react';

/**
 * Primitivas da tabela de listagem do portal, conforme `spec/AI-UI-Design/portal-fornecedor.html`
 * (cabeçalho ordenável + linhas + rodapé com paginação). Compartilhadas pela Vitrine de Editais e por
 * Meus Credenciamentos, que usam a mesma tabela no spec.
 */

export type Direcao = 'asc' | 'desc';

export const celula: CSSProperties = {
  verticalAlign: 'middle', borderTop: '1px solid var(--divider)', padding: '15px 16px',
};

/** Tag compacta da sigla da secretaria (ex.: SEME). */
export const siglaTag: CSSProperties = {
  font: '600 10.5px var(--font-body)', letterSpacing: '.05em', color: 'var(--azul-800)',
  background: 'var(--azul-100)', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap',
};

export const botaoExportar: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 15px', border: '1px solid var(--border)',
  borderRadius: 10, background: '#fff', color: 'var(--cinza-700)', font: '600 13.5px var(--font-body)', cursor: 'pointer',
};

export function cabecalho(ordenavel: boolean, alinhamento: CSSProperties['textAlign'] = 'left'): CSSProperties {
  return {
    verticalAlign: 'middle', padding: '13px 16px', font: '600 11px var(--font-body)', letterSpacing: '.05em',
    color: 'var(--azul-900)', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: alinhamento,
    cursor: ordenavel ? 'pointer' : 'default', userSelect: 'none', background: '#E2E7EE',
  };
}

/** Seta de ordenação anexada ao rótulo da coluna ativa. */
export const setaOrdem = (ativa: boolean, direcao: Direcao) => (ativa ? (direcao === 'asc' ? ' ↑' : ' ↓') : '');

/** Botão de página do rodapé; `atual` pinta o estado selecionado. */
export function estiloPagina(atual: boolean): CSSProperties {
  return {
    minWidth: 34, height: 34, borderRadius: 8, fontSize: 13,
    border: `1px solid ${atual ? 'var(--azul-700)' : 'var(--border)'}`,
    background: atual ? 'var(--azul-700)' : '#fff',
    color: atual ? '#fff' : 'var(--cinza-700)',
  };
}

/** Rodapé de paginação: contagem à esquerda, páginas à direita (some quando há uma só página). */
export function Paginacao({
  info, pagina, totalPaginas, onPagina, rotuloPagina,
}: {
  info: string;
  pagina: number;
  totalPaginas: number;
  onPagina: (n: number) => void;
  rotuloPagina: (n: number) => string;
}) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        padding: '14px 18px', borderTop: '1px solid var(--divider)', flexWrap: 'wrap',
      }}
    >
      <span data-cy="paginacao-info" style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{info}</span>
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              data-cy="pagina"
              aria-current={n === pagina ? 'page' : undefined}
              aria-label={rotuloPagina(n)}
              onClick={() => onPagina(n)}
              className="btn"
              style={estiloPagina(n === pagina)}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
