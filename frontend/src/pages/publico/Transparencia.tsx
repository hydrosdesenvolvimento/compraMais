import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { IconeDemandas, IconeEditais, IconePredio, IconeUsuario, IconeCredenciamentos } from '../../design-system/icons';

/** Máscara Receita da subclasse CNAE de 7 dígitos (ex.: 1412601 → 1412-6/01); mantém o valor se não bater. */
function formatarCnae(codigo: string): string {
  const d = (codigo ?? '').replace(/\D/g, '');
  return d.length === 7 ? `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}` : codigo;
}

/**
 * Portal público de Transparência (Épico 9 / US2 · RN007). BI aberto ao cidadão (sem login, §VI):
 * investimento na economia local (valor distribuído às empresas), fornecedores ativos, editais em
 * andamento, % de MEIs participantes, investimento por secretaria e participação por porte.
 */
export function Transparencia() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ['transparencia'], queryFn: api.transparencia });
  const moeda = useMemo(() => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }), [i18n.language]);
  if (isLoading || !data) return <p data-cy="carregando">{t('transparencia.carregando')}</p>;

  const maxInvest = Math.max(1, ...data.investimentoPorSecretaria.map((s) => s.valor));
  const totalPart = Math.max(1, data.participacaoPorPorte.reduce((s, p) => s + p.fornecedores, 0));

  return (
    <div className="stack" style={{ animation: 'cmfade .3s' }}>
      <div>
        <h1 className="cm-page-title">{t('transparencia.tituloPagina')}</h1>
        <p className="cm-page-sub" style={{ maxWidth: 640 }}>{t('transparencia.subtituloPagina')}</p>
      </div>

      {/* Investimento na economia local (hero) */}
      <div className="card" data-cy="investimento" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '24px 26px', background: 'var(--azul-900)', color: '#fff', border: 'none' }}>
        <span style={{ width: 52, height: 52, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.12)', flexShrink: 0 }}>
          <IconeCredenciamentos width={24} height={24} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, letterSpacing: '.04em', textTransform: 'uppercase', opacity: .8 }}>{t('transparencia.investimentoTitulo')}</div>
          <div data-cy="investimento-total" style={{ font: '700 34px var(--font-body)', lineHeight: 1.1, margin: '2px 0' }}>{moeda.format(data.investimentoTotal)}</div>
          <div style={{ fontSize: 13, opacity: .85 }}>{t('transparencia.investimentoSub')}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="cm-grid-3">
        <Kpi cy="kpi-fornecedores" icone={<IconeUsuario width={20} height={20} />} valor={String(data.fornecedoresAtivos)} rotulo={t('transparencia.kpiFornecedoresAtivos')} />
        <Kpi cy="kpi-editais" icone={<IconeEditais width={20} height={20} />} valor={String(data.editaisVigentes)} rotulo={t('transparencia.kpiEditais')} />
        <Kpi cy="kpi-mei" tom="amber" icone={<IconeDemandas width={20} height={20} />} valor={`${data.meiPercentual}%`} rotulo={t('transparencia.kpiMei')} />
      </div>

      {/* Investimento por secretaria */}
      <div style={panel}>
        <div style={panelHead}>
          <span style={panelIcon('var(--azul-100)', 'var(--azul-700)')}><IconePredio width={17} height={17} /></span>
          <h2 style={panelTitle}>{t('transparencia.painelInvestimento')}</h2>
        </div>
        <div style={panelBody}>
          {data.investimentoPorSecretaria.length === 0 ? (
            <p data-cy="sem-investimento" className="cm-page-sub" style={{ margin: 0 }}>{t('transparencia.semInvestimento')}</p>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {data.investimentoPorSecretaria.map((s) => (
                <div key={s.secretaria} data-cy="investimento-secretaria">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                    <span style={{ font: '600 13.5px var(--font-body)', color: 'var(--azul-900)' }}>{s.secretaria}</span>
                    <span style={{ font: '600 13.5px var(--font-body)', color: 'var(--azul-700)' }}>{moeda.format(s.valor)}</span>
                  </div>
                  <div style={barTrack}><div style={{ ...barFill('var(--azul-600)'), width: `${Math.round((s.valor / maxInvest) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Participação por porte */}
      <div style={panel}>
        <div style={panelHead}>
          <span style={panelIcon('var(--atencao-bg)', '#8A5410')}><IconeUsuario width={17} height={17} /></span>
          <h2 style={panelTitle}>{t('transparencia.painelParticipacao')}</h2>
        </div>
        <div style={panelBody}>
          <div style={{ display: 'grid', gap: 14 }}>
            {data.participacaoPorPorte.map((p) => {
              const pct = Math.round((p.fornecedores / totalPart) * 100);
              return (
                <div key={p.porte} data-cy="participacao-porte">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
                    <span style={{ font: '600 13.5px var(--font-body)', color: 'var(--azul-900)' }}>{p.porte}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--cinza-500)' }}>{pct}% · {t('transparencia.fornecedoresContagem', { count: p.fornecedores })}</span>
                  </div>
                  <div style={barTrack}><div style={{ ...barFill('#B8860B'), width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Setores (CNAE) atendidos */}
      {data.segmentos.length > 0 && (
        <div style={panel}>
          <div style={panelHead}>
            <span style={panelIcon('var(--azul-100)', 'var(--azul-700)')}><IconeDemandas width={17} height={17} /></span>
            <h2 style={panelTitle}>{t('transparencia.painelSegmentos')}</h2>
            <span className="tag" style={{ marginLeft: 'auto' }}>{data.segmentos.length}</span>
          </div>
          <div style={panelBody}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {data.segmentos.map((s) => (
                <span key={s.codigo} data-cy="segmento" style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, background: 'var(--azul-50)', border: '1px solid var(--azul-100)', borderRadius: 12, padding: '8px 14px', maxWidth: 340 }}>
                  <span style={{ font: '600 13px var(--font-body)', color: 'var(--azul-900)' }}>{s.descricao ?? formatarCnae(s.codigo)}</span>
                  {s.descricao && <span data-cy="segmento-codigo" style={{ fontSize: 11.5, color: 'var(--cinza-500)', fontVariantNumeric: 'tabular-nums' }}>{t('transparencia.cnae', { codigo: formatarCnae(s.codigo) })}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ cy, icone, valor, rotulo, tom }: { cy: string; icone: React.ReactNode; valor: string; rotulo: string; tom?: 'amber' }) {
  const bg = tom === 'amber' ? 'var(--atencao-bg)' : 'var(--azul-100)';
  const fg = tom === 'amber' ? '#8A5410' : 'var(--azul-700)';
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px' }}>
      <span style={{ width: 42, height: 42, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg, flexShrink: 0 }}>{icone}</span>
      <div>
        <div data-cy={cy} style={{ font: '600 26px var(--font-body)', color: 'var(--azul-900)', lineHeight: 1.1 }}>{valor}</div>
        <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 3 }}>{rotulo}</div>
      </div>
    </div>
  );
}

const panel: CSSProperties = { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' };
const panelHead: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '1px solid var(--divider)', flexWrap: 'wrap' };
const panelIcon = (bg: string, fg: string): CSSProperties => ({ width: 32, height: 32, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: bg, color: fg, flexShrink: 0 });
const panelTitle: CSSProperties = { font: '600 15px var(--font-body)', color: 'var(--azul-900)', margin: 0 };
const panelBody: CSSProperties = { padding: '20px 22px' };
const barTrack: CSSProperties = { height: 8, borderRadius: 999, background: 'var(--azul-50)', overflow: 'hidden' };
const barFill = (cor: string): CSSProperties => ({ height: '100%', borderRadius: 999, background: cor, minWidth: 4 });
