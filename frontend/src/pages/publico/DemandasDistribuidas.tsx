import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { api, type DemandaDistribuidaView } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { IconeDemandas } from '../../design-system/icons';

/**
 * Demandas distribuídas (UC008 / Épico 5) — o fornecedor vê as demandas que o Motor de Distribuição lhe
 * atribuiu. Cada demanda é o resultado do rateio determinístico limitado ao seu teto declarado (RN005).
 * Duas classificações (protótipo `spec/Prototipo/portal-fornecedor.html`):
 *  - `titular` → recebeu cota: mostra o rateio (demanda total / aptos / cota) e a barra cota × teto;
 *  - `reserva` → apto porém fora da matriz vigente: aviso de Cadastro de Reserva (2ª demanda, UC009).
 * Somente leitura — a empresa vem do token (`/distribuicao/minhas` resolve o fornecedor pelo JWT, AD-20).
 */
const pill: CSSProperties = {
  font: '600 11.5px var(--font-body)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap',
};
const cardMetrica: CSSProperties = { background: 'var(--bg-page)', borderRadius: 11, padding: '14px 16px' };
const rotuloMetrica: CSSProperties = { fontSize: 12, color: 'var(--cinza-500)' };
const valorMetrica: CSSProperties = { font: '600 22px var(--font-body)', color: 'var(--azul-900)', marginTop: 3 };

export function DemandasDistribuidas() {
  const { t, i18n } = useTranslation();
  const { data: demandas = [], isLoading } = useQuery({
    queryKey: ['distribuicao-minhas'],
    queryFn: () => api.demandasDistribuidas(),
  });

  const fmt = (n: number) => new Intl.NumberFormat(i18n.language).format(n);

  return (
    <div className="stack" data-cy="demandas-distribuidas">
      <div>
        <h1 style={{ fontWeight: 600, fontSize: 22, color: 'var(--azul-900)', margin: 0 }}>
          {t('demandasDistribuidas.titulo')}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--cinza-500)' }}>
          {t('demandasDistribuidas.subtitulo')}
        </p>
      </div>

      {isLoading ? (
        <p data-cy="carregando">{t('demandasDistribuidas.carregando')}</p>
      ) : demandas.length === 0 ? (
        <div data-cy="estado-vazio" className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
          <div style={{ display: 'inline-grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--azul-50)', color: 'var(--azul-700)', marginBottom: 12 }}>
            <IconeDemandas width={24} height={24} />
          </div>
          <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('demandasDistribuidas.vazioTitulo')}</div>
          <div style={{ fontSize: 13.5 }}>{t('demandasDistribuidas.vazioDica')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {demandas.map((d: DemandaDistribuidaView) => {
            const ehTitular = d.classificacao === 'titular';
            const larguraBarra = ehTitular && d.cota != null && d.teto > 0 ? Math.min(100, (d.cota / d.teto) * 100) : 0;
            return (
              <div key={d.editalId} data-cy="demanda-item" data-classificacao={d.classificacao} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--divider)', flexWrap: 'wrap' }}>
                  <span style={{ font: '600 14px var(--font-body)', color: 'var(--azul-700)' }}>{d.numero}</span>
                  {d.secretariaSigla && (
                    <span style={{ font: '600 10px var(--font-body)', letterSpacing: '.06em', color: 'var(--azul-800)', background: 'var(--azul-100)', padding: '3px 9px', borderRadius: 6 }}>{d.secretariaSigla}</span>
                  )}
                  <span style={{ fontSize: 14, color: 'var(--text-title)', flex: 1, minWidth: 160 }}>{d.objeto}</span>
                  {ehTitular ? (
                    <span data-cy="situacao" style={{ ...pill, color: 'var(--sucesso)', background: 'var(--sucesso-bg)' }}>{t('demandasDistribuidas.status.emExecucao')}</span>
                  ) : (
                    <span data-cy="situacao" style={{ ...pill, color: '#8A5410', background: 'var(--atencao-bg)' }}>{t('demandasDistribuidas.status.reserva')}</span>
                  )}
                </div>

                {ehTitular ? (
                  <div data-cy="rateio" style={{ padding: '20px 22px' }}>
                    <div style={{ font: '600 10.5px var(--font-body)', letterSpacing: '.12em', color: 'var(--cinza-400)', marginBottom: 14 }}>{t('demandasDistribuidas.rateioLabel')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                      <div style={cardMetrica}><div style={rotuloMetrica}>{t('demandasDistribuidas.demandaTotal')}</div><div style={valorMetrica}>{fmt(d.total ?? 0)}</div></div>
                      <div style={cardMetrica}><div style={rotuloMetrica}>{t('demandasDistribuidas.fornecedoresAptos')}</div><div style={valorMetrica}>{fmt(d.aptos ?? 0)}</div></div>
                      <div style={{ ...cardMetrica, background: 'var(--azul-50)' }}><div style={{ ...rotuloMetrica, color: 'var(--azul-700)' }}>{t('demandasDistribuidas.cotaFinal')}</div><div data-cy="cota" style={valorMetrica}>{fmt(d.cota ?? 0)}</div></div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--cinza-500)', marginBottom: 6 }}>
                          <span>{t('demandasDistribuidas.capacidadeLabel')}</span>
                          <span style={{ fontWeight: 600, color: 'var(--azul-800)' }}>{fmt(d.cota ?? 0)} / {fmt(d.teto)}</span>
                        </div>
                        <div style={{ height: 9, borderRadius: 999, background: 'var(--cinza-100)' }}>
                          <div style={{ height: '100%', width: `${larguraBarra}%`, borderRadius: 999, background: 'var(--azul-700)' }}></div>
                        </div>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 12.5px var(--font-body)', color: 'var(--sucesso)', background: 'var(--sucesso-bg)', padding: '6px 12px', borderRadius: 999 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        {t('demandasDistribuidas.dentroDoTeto')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div data-cy="reserva-aviso" style={{ padding: '18px 22px', display: 'flex', gap: 13, alignItems: 'flex-start', background: 'var(--atencao-bg)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A5410" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <div style={{ fontSize: 13.5, color: '#8A5410', lineHeight: 1.55 }}>
                      <Trans i18nKey="demandasDistribuidas.reservaAviso" components={{ b: <strong /> }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Container: exige empresa na sessão (a rota usa o token, mas a UI orienta quem não representa empresa). */
export function DemandasDistribuidasConectada() {
  const { t } = useTranslation();
  const empresaId = obterUsuario()?.empresaId;
  if (!empresaId) return <p data-cy="sem-empresa" style={{ color: 'var(--cinza-500)' }}>{t('demandasDistribuidas.semEmpresa')}</p>;
  return <DemandasDistribuidas />;
}
