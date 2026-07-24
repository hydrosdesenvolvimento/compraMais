import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoItemView, type EditalEmAndamentoView } from '../../lib/api';
import { diasAte } from '../../lib/prazos';
import { Pill } from '../../design-system/components';
import { IconeEditais, IconeUsuario, IconeCredenciamentos, IconeDocumentos, IconeBloquear, IconeRelogio, IconeSeta } from '../../design-system/icons';

/** Janela (dias) para sinalizar editais próximos do vencimento no painel de alertas. */
const DIAS_ALERTA_VENCIMENTO = 30;
const MAX_EDITAIS = 5;

const cardAlerta: CSSProperties = { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff' };

/**
 * Painel administrativo — “Visão geral” (Épico 9 / US1). Consolida os indicadores da operação num único
 * aggregate (`GET /admin/dashboard`): KPIs (demandas, fornecedores ativos, valor estimado, documentos
 * pendentes), editais em andamento e alertas operacionais (bloqueios, fila de análise, editais a vencer).
 */
export function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: f, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.dashboardAdmin });
  const secretarias = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias') });

  const moeda = useMemo(() => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }), [i18n.language]);
  const secretariasLista = (secretarias.data as CatalogoItemView[] | undefined) ?? [];
  const siglaDe = (id: string): string => { const s = secretariasLista.find((x) => x.id === id); return s?.sigla ?? s?.nome ?? id; };

  if (isLoading || !f) return <p data-cy="carregando">{t('admin.dashboard.carregando')}</p>;

  const totalDemandas = f.editaisPorSituacao.rascunho + f.editaisPorSituacao.publicado + f.editaisPorSituacao.encerrado;
  const pctMei = f.fornecedoresAtivos > 0 ? Math.round((f.fornecedoresMei / f.fornecedoresAtivos) * 100) : 0;
  const editais = [...f.editaisEmAndamento].sort(ordenarPorPrazo);
  const vencendo = f.editaisEmAndamento.filter((e) => e.prazoVigencia && dentroDaJanela(e.prazoVigencia)).length;
  const semAlertas = f.bloqueiosAtivos === 0 && f.documentosPendentes === 0 && vencendo === 0;

  return (
    <div className="stack" data-cy="admin-dashboard">
      <div><h1 className="page-title">{t('admin.dashboard.titulo')}</h1><p className="page-sub">{t('admin.dashboard.subtitulo')}</p></div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <CardKpi icone={<IconeEditais width={20} height={20} />} valor={String(totalDemandas)} titulo={t('admin.dashboard.totalDemandas')} rodape={t('admin.dashboard.abertos', { count: f.editaisPorSituacao.publicado })} />
        <CardKpi icone={<IconeUsuario width={20} height={20} />} valor={String(f.fornecedoresAtivos)} titulo={t('admin.dashboard.fornecedoresAtivos')} rodape={t('admin.dashboard.meiPct', { pct: pctMei })} />
        <CardKpi icone={<IconeCredenciamentos width={20} height={20} />} valor={moeda.format(f.valorEstimado)} titulo={t('admin.dashboard.valorEstimado')} rodape={t('admin.dashboard.valorEstimadoSub')} />
        <CardKpi icone={<IconeDocumentos width={20} height={20} />} valor={String(f.documentosPendentes)} titulo={t('admin.dashboard.documentosPendentes')} rodape={t('admin.dashboard.aguardando')} destaque={f.documentosPendentes > 0} />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <section className="card" data-cy="editais-andamento" style={{ flex: '2 1 340px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--azul-900)', margin: 0 }}>{t('admin.dashboard.editaisEmAndamento')}</h2>
            <button type="button" data-cy="ver-todos" onClick={() => navigate({ to: '/admin/editais' })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--azul-600)', fontSize: 13, fontWeight: 500 }}>
              {t('admin.dashboard.verTodos')} <IconeSeta width={14} height={14} />
            </button>
          </div>
          {editais.length === 0 ? (
            <p className="page-sub" data-cy="sem-editais" style={{ margin: 0 }}>{t('admin.dashboard.semEditais')}</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {editais.slice(0, MAX_EDITAIS).map((e) => (
                <div key={e.id} data-cy="edital-linha" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: 'var(--azul-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>{e.numero}</strong> — {e.objeto}</div>
                    <div style={{ fontSize: 12, color: 'var(--cinza-500)', marginTop: 2 }}>{siglaDe(e.secretariaId)} · {t('admin.dashboard.credenciados', { count: e.credenciados })}</div>
                  </div>
                  <Pill tom="success">{t('admin.dashboard.emAndamento')}</Pill>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="card" data-cy="alertas" style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--azul-900)', margin: '0 0 12px' }}>{t('admin.dashboard.alertas')}</h2>
          {semAlertas ? (
            <p className="page-sub" data-cy="sem-alertas" style={{ margin: 0 }}>{t('admin.dashboard.semAlertas')}</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {f.bloqueiosAtivos > 0 && (
                <LinhaAlerta icone={<IconeBloquear width={18} height={18} />} titulo={t('admin.dashboard.fornecedoresBloqueados', { count: f.bloqueiosAtivos })} texto={t('admin.dashboard.fornecedoresBloqueadosSub')} />
              )}
              {f.documentosPendentes > 0 && (
                <LinhaAlerta icone={<IconeDocumentos width={18} height={18} />} titulo={t('admin.dashboard.docsAnalise', { count: f.documentosPendentes })} texto={t('admin.dashboard.docsAnaliseSub')} />
              )}
              {vencendo > 0 && (
                <LinhaAlerta icone={<IconeRelogio width={18} height={18} />} titulo={t('admin.dashboard.editaisVencendo', { count: vencendo })} texto={t('admin.dashboard.editaisVencendoSub', { dias: DIAS_ALERTA_VENCIMENTO })} />
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function CardKpi({ icone, valor, titulo, rodape, destaque }: { icone: ReactNode; valor: string; titulo: string; rodape: string; destaque?: boolean }) {
  return (
    <div data-cy="card" className="card" style={{ display: 'grid', gap: 6 }}>
      <span style={{ color: destaque ? '#8A5410' : 'var(--azul-600)' }}>{icone}</span>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--azul-900)', lineHeight: 1.1 }}>{valor}</div>
      <div style={{ color: 'var(--cinza-700)', fontSize: 14 }}>{titulo}</div>
      <div style={{ color: 'var(--cinza-500)', fontSize: 12 }}>{rodape}</div>
    </div>
  );
}

function LinhaAlerta({ icone, titulo, texto }: { icone: ReactNode; titulo: string; texto: string }) {
  return (
    <div data-cy="alerta" style={{ ...cardAlerta, borderColor: 'var(--amarelo-300, #e6c47a)', background: 'var(--amarelo-50, #fdf6e3)' }}>
      <span style={{ flexShrink: 0, marginTop: 1, color: '#8A5410' }}>{icone}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--azul-900)' }}>{titulo}</div>
        <div style={{ fontSize: 12, color: 'var(--cinza-700)', marginTop: 2 }}>{texto}</div>
      </div>
    </div>
  );
}

/** Editais mais próximos do vencimento primeiro (prazo nulo por último). */
function ordenarPorPrazo(a: EditalEmAndamentoView, b: EditalEmAndamentoView): number {
  if (!a.prazoVigencia) return 1;
  if (!b.prazoVigencia) return -1;
  return a.prazoVigencia.localeCompare(b.prazoVigencia);
}

function dentroDaJanela(prazoIso: string): boolean {
  const dias = diasAte(prazoIso);
  return dias >= 0 && dias <= DIAS_ALERTA_VENCIMENTO;
}
