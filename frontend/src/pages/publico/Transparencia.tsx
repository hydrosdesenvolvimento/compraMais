import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconeDemandas, IconeEditais, IconePredio } from '../../design-system/icons';

/** Portal público de transparência (Épico 9 / US2). Sem login; só agregados públicos (§VI). */
export function Transparencia() {
  const { data, isLoading } = useQuery({ queryKey: ['transparencia'], queryFn: api.transparencia });
  if (isLoading || !data) return <p data-cy="carregando">Carregando…</p>;

  return (
    <div className="stack" style={{ animation: 'cmfade .3s' }}>
      <div>
        <h1 className="cm-page-title">Demandas distribuídas</h1>
        <p className="cm-page-sub" style={{ maxWidth: 620 }}>
          O rateio é igualitário entre os fornecedores aptos e sempre limitado à sua
          capacidade declarada (teto). Veja abaixo os agregados públicos do programa Compra Mais.
        </p>
      </div>

      {/* KPIs agregados */}
      <div className="cm-grid-3">
        <div className="card" style={kpiCard}>
          <div style={kpiIcon('var(--azul-100)', 'var(--azul-700)')}>
            <IconeEditais width={20} height={20} />
          </div>
          <div>
            <div
              data-cy="editais-vigentes"
              style={{ font: '600 26px var(--font-body)', color: 'var(--azul-900)', lineHeight: 1.1 }}
            >
              {data.editaisVigentes}
            </div>
            <div style={kpiLabel}>Editais vigentes</div>
          </div>
        </div>

        <div className="card" style={kpiCard}>
          <div style={kpiIcon('var(--azul-100)', 'var(--azul-700)')}>
            <IconePredio width={20} height={20} />
          </div>
          <div>
            <div style={{ font: '600 26px var(--font-body)', color: 'var(--azul-900)', lineHeight: 1.1 }}>
              {data.secretarias.length}
            </div>
            <div style={kpiLabel}>Secretarias atendidas</div>
          </div>
        </div>

        <div className="card" style={kpiCard}>
          <div style={kpiIcon('var(--atencao-bg)', '#8A5410')}>
            <IconeDemandas width={20} height={20} />
          </div>
          <div>
            <div style={{ font: '600 26px var(--font-body)', color: 'var(--azul-900)', lineHeight: 1.1 }}>
              {data.segmentos.length}
            </div>
            <div style={kpiLabel}>Segmentos (CNAE) atendidos</div>
          </div>
        </div>
      </div>

      {/* Secretarias atendidas */}
      <div style={panel}>
        <div style={panelHead}>
          <span style={panelIcon('var(--azul-100)', 'var(--azul-700)')}>
            <IconePredio width={17} height={17} />
          </span>
          <h2 style={panelTitle}>Secretarias atendidas</h2>
          <span className="tag" style={{ marginLeft: 'auto' }}>{data.secretarias.length}</span>
        </div>
        <div style={panelBody}>
          <div style={chipWrap}>
            {data.secretarias.map((s) => (
              <span key={s} data-cy="secretaria" style={chipNavy}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Segmentos (CNAE) atendidos */}
      <div style={panel}>
        <div style={panelHead}>
          <span style={panelIcon('var(--atencao-bg)', '#8A5410')}>
            <IconeDemandas width={17} height={17} />
          </span>
          <h2 style={panelTitle}>Segmentos (CNAE) atendidos</h2>
          <span className="tag" style={{ marginLeft: 'auto' }}>{data.segmentos.length}</span>
        </div>
        <div style={panelBody}>
          <div style={chipWrap}>
            {data.segmentos.map((s) => (
              <span key={s} data-cy="segmento" style={chipAmber}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- estilos inline (design system: navy/âmbar, cartões do mockup) ---- */
const kpiCard: CSSProperties = { display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px' };
const kpiLabel: CSSProperties = { fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 3 };
const kpiIcon = (bg: string, fg: string): CSSProperties => ({
  width: 42, height: 42, borderRadius: 11, display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', background: bg, color: fg, flexShrink: 0,
});

const panel: CSSProperties = {
  background: '#fff', border: '1px solid var(--border)', borderRadius: 14,
  boxShadow: 'var(--shadow-xs)', overflow: 'hidden',
};
const panelHead: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px',
  borderBottom: '1px solid var(--divider)', flexWrap: 'wrap',
};
const panelIcon = (bg: string, fg: string): CSSProperties => ({
  width: 32, height: 32, borderRadius: 9, display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', background: bg, color: fg, flexShrink: 0,
});
const panelTitle: CSSProperties = { font: '600 15px var(--font-body)', color: 'var(--azul-900)', margin: 0 };
const panelBody: CSSProperties = { padding: '20px 22px' };
const chipWrap: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10 };
const chipNavy: CSSProperties = {
  font: '600 12.5px var(--font-body)', color: 'var(--azul-800)', background: 'var(--azul-100)',
  padding: '7px 14px', borderRadius: 999,
};
const chipAmber: CSSProperties = {
  font: '600 12.5px var(--font-body)', color: '#8A5410', background: 'var(--atencao-bg)',
  padding: '7px 14px', borderRadius: 999,
};
