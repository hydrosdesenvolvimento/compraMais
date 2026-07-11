import { useState, type CSSProperties, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { IconeDemandas, IconeEditais, IconePredio } from '../../design-system/icons';

/** Portal público de transparência (UC011 / RF010). Sem login; só agregados não-identificáveis (RN013). */
export function Transparencia() {
  const { t } = useTranslation();
  // Filtro básico por período (UC011 A1). `rascunho` = digitação; `periodo` = filtro efetivamente aplicado.
  const [rascunho, setRascunho] = useState<{ de: string; ate: string }>({ de: '', ate: '' });
  const [periodo, setPeriodo] = useState<{ de: string; ate: string }>({ de: '', ate: '' });
  const { data, isLoading } = useQuery({
    queryKey: ['transparencia', periodo.de, periodo.ate],
    queryFn: () => api.transparencia({ de: periodo.de || undefined, ate: periodo.ate || undefined }),
  });

  function aplicar(e: FormEvent) {
    e.preventDefault();
    setPeriodo(rascunho);
  }
  function limpar() {
    setRascunho({ de: '', ate: '' });
    setPeriodo({ de: '', ate: '' });
  }

  return (
    <div className="stack" style={{ animation: 'cmfade .3s' }}>
      <div>
        <h1 className="cm-page-title">{t('transparencia.tituloPagina')}</h1>
        <p className="cm-page-sub" style={{ maxWidth: 620 }}>
          {t('transparencia.subtituloPagina')}
        </p>
      </div>

      {/* Filtro básico por período (UC011 A1) */}
      <form style={filtro} onSubmit={aplicar} aria-label={t('transparencia.filtroTitulo')}>
        <label style={filtroLabel}>
          {t('transparencia.filtroDe')}
          <input
            type="date" data-cy="filtro-de" value={rascunho.de}
            onChange={(e) => setRascunho((r) => ({ ...r, de: e.target.value }))} style={filtroInput}
          />
        </label>
        <label style={filtroLabel}>
          {t('transparencia.filtroAte')}
          <input
            type="date" data-cy="filtro-ate" value={rascunho.ate}
            onChange={(e) => setRascunho((r) => ({ ...r, ate: e.target.value }))} style={filtroInput}
          />
        </label>
        <button type="submit" data-cy="filtro-aplicar" className="btn btn-primary">{t('transparencia.filtroAplicar')}</button>
        {(periodo.de || periodo.ate) && (
          <button type="button" data-cy="filtro-limpar" className="btn btn-ghost" onClick={limpar}>
            {t('transparencia.filtroLimpar')}
          </button>
        )}
      </form>

      {isLoading || !data ? (
        <p data-cy="carregando">{t('transparencia.carregando')}</p>
      ) : (
        <TransparenciaAgregados data={data} />
      )}
    </div>
  );
}

/** Bloco de agregados (KPIs + painéis). Extraído para manter o filtro sempre visível durante o loading. */
function TransparenciaAgregados({ data }: { data: import('../../lib/api').Transparencia }) {
  const { t } = useTranslation();
  return (
    <>

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
            <div style={kpiLabel}>{t('transparencia.kpiEditaisVigentes')}</div>
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
            <div style={kpiLabel}>{t('transparencia.kpiSecretarias')}</div>
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
            <div style={kpiLabel}>{t('transparencia.kpiSegmentos')}</div>
          </div>
        </div>
      </div>

      {/* Secretarias atendidas */}
      <div style={panel}>
        <div style={panelHead}>
          <span style={panelIcon('var(--azul-100)', 'var(--azul-700)')}>
            <IconePredio width={17} height={17} />
          </span>
          <h2 style={panelTitle}>{t('transparencia.painelSecretarias')}</h2>
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
          <h2 style={panelTitle}>{t('transparencia.painelSegmentos')}</h2>
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
    </>
  );
}

/* ---- estilos inline (design system: navy/âmbar, cartões do mockup) ---- */
const filtro: CSSProperties = {
  display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap',
  background: '#fff', border: '1px solid var(--border)', borderRadius: 14,
  boxShadow: 'var(--shadow-xs)', padding: '14px 18px',
};
const filtroLabel: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 5,
  font: '600 12.5px var(--font-body)', color: 'var(--cinza-500)',
};
const filtroInput: CSSProperties = {
  font: '400 14px var(--font-body)', color: 'var(--azul-900)',
  border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: '#fff',
};
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
