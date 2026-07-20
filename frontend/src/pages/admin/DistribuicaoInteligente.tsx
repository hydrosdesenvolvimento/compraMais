import { useEffect, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Botao } from '../../design-system/components/Botao';

/**
 * Painel Admin · "Distribuição Inteligente" (Operação — SMGA/CPL). Dado um edital publicado, mostra o
 * rateio equitativo do Motor respeitando a capacidade declarada (UC008 / RF005 / RN005). Fiel a
 * `spec/Prototipo/painel-administrativo.html` (view `isDistribuicao`): cabeçalho do edital + totais
 * (Total da demanda / Distribuído / Habilitados) + tabela "Resultado da distribuição" + "Homologar".
 *
 * O protótipo mostra um edital; a operação escolhe qual por um seletor de editais publicados. Enquanto
 * a matriz não é congelada, a tela exibe o **preview** determinístico do Motor (`homologada=false`);
 * "Homologar" executa e congela a matriz append-only (UC008: "frações homologadas"). Placeholder
 * honesto: o `develop` não tem a máquina de estado AD-37/`em_distribuicao`, então o chip reflete o
 * estado do rateio (Em Distribuição × Homologada), não um estado do edital. As unidades ("conjuntos",
 * "un/mês") são de exibição — o domínio guarda apenas números.
 */

const chip: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
const stat: CSSProperties = { textAlign: 'center' };
const statLabel: CSSProperties = { fontSize: 12.5, color: 'var(--cinza-500)' };
const statValor: CSSProperties = { fontWeight: 600, fontSize: 22, color: 'var(--azul-900)', marginTop: 4 };
const th: CSSProperties = { padding: '13px 20px', font: '600 11px var(--font-body)', letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--cinza-500)', background: '#E2E7EE' };
const td: CSSProperties = { padding: '15px 20px', borderTop: '1px solid var(--divider)', fontSize: 14 };

export function DistribuicaoInteligente() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [editalId, setEditalId] = useState<string>('');

  const { data: editais = [], isLoading: carregandoEditais } = useQuery({
    queryKey: ['distribuicao-editais-publicados'],
    queryFn: () => api.editaisOperacao('publicado'),
  });

  // Default = primeiro edital publicado assim que a lista chega (sem sobrescrever a escolha do operador).
  useEffect(() => {
    if (!editalId && editais.length > 0) setEditalId(editais[0].id);
  }, [editais, editalId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['distribuicao-resumo', editalId],
    queryFn: () => api.resumoDistribuicao(editalId),
    enabled: !!editalId,
  });

  const homologar = useMutation({
    mutationFn: () => api.homologarDistribuicao(editalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['distribuicao-resumo', editalId] }),
  });

  /** Fração cota/total formatada como percentual no idioma corrente (ex.: 50,0%). */
  const percentual = (cota: number, total: number): string =>
    total > 0 ? new Intl.NumberFormat(i18n.language, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(cota / total) : '—';
  const numero = (n: number): string => new Intl.NumberFormat(i18n.language).format(n);

  return (
    <div className="stack" data-cy="admin-distribuicao">
      <div>
        <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.distribuicao.eyebrow')}</div>
        <h1 className="page-title">{t('admin.distribuicao.titulo')}</h1>
        <p className="page-sub">{t('admin.distribuicao.subtitulo')}</p>
      </div>

      {carregandoEditais ? (
        <p data-cy="carregando-editais" className="page-sub">{t('admin.distribuicao.carregando')}</p>
      ) : editais.length === 0 ? (
        <div data-cy="sem-editais" className="card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
          {t('admin.distribuicao.semEditais')}
        </div>
      ) : (
        <>
          <label style={{ display: 'block', maxWidth: 520 }}>
            <span style={{ font: '600 11px var(--font-body)', letterSpacing: '.06em', color: 'var(--cinza-500)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              {t('admin.distribuicao.seletorLabel')}
            </span>
            <select className="input" data-cy="seletor-edital" value={editalId} onChange={(e) => setEditalId(e.target.value)} style={{ width: '100%' }}>
              {editais.map((ed) => (
                <option key={ed.id} value={ed.id}>{ed.numero} — {ed.objeto}</option>
              ))}
            </select>
          </label>

          {isError ? (
            <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.distribuicao.erroCarregar')}</p>
          ) : isLoading || !data ? (
            <p data-cy="carregando" className="page-sub">{t('admin.distribuicao.carregando')}</p>
          ) : (
            <>
              {/* Card do edital + totais */}
              <div className="card" data-cy="card-edital" data-homologada={data.homologada}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ font: '600 13px var(--font-body)', color: 'var(--azul-700)' }}>{data.edital.numero}</div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--azul-900)', margin: '3px 0 2px' }}>{data.edital.objeto}</div>
                    <div style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{data.edital.secretariaSigla ?? '—'}</div>
                  </div>
                  <span data-cy="chip-situacao" style={{ ...chip, ...(data.homologada ? { background: 'var(--sucesso-bg)', color: 'var(--sucesso)' } : { background: 'var(--azul-50)', color: 'var(--azul-700)' }) }}>
                    {data.homologada ? t('admin.distribuicao.chip.homologada') : t('admin.distribuicao.chip.emDistribuicao')}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--divider)' }}>
                  <div style={stat}><div style={statLabel}>{t('admin.distribuicao.stats.total')}</div><div style={statValor} data-cy="stat-total">{numero(data.total)}</div></div>
                  <div style={stat}><div style={statLabel}>{t('admin.distribuicao.stats.distribuido')}</div><div style={{ ...statValor, color: 'var(--sucesso)' }} data-cy="stat-distribuido">{numero(data.distribuido)}</div></div>
                  <div style={stat}><div style={statLabel}>{t('admin.distribuicao.stats.habilitados')}</div><div style={statValor} data-cy="stat-habilitados">{numero(data.habilitados)}</div></div>
                </div>
              </div>

              {data.deficit && (
                <div data-cy="aviso-deficit" style={{ display: 'flex', gap: 12, background: 'var(--atencao-bg)', border: '1px solid var(--atencao)', borderRadius: 12, padding: '15px 18px', fontSize: 13, lineHeight: 1.5, color: '#8A5410' }}>
                  {t('admin.distribuicao.deficitAviso', { total: numero(data.total), distribuido: numero(data.distribuido), deficit: numero(data.deficitQuantidade) })}
                </div>
              )}

              {/* Tabela do rateio */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--divider)', font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>
                  {t('admin.distribuicao.resultadoTitulo')}
                </div>
                {data.rateio.length === 0 ? (
                  <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
                    <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.distribuicao.vazioTitulo')}</div>
                    <div style={{ fontSize: 13.5 }}>{t('admin.distribuicao.vazioDica')}</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th scope="col" style={{ ...th, textAlign: 'left' }}>{t('admin.distribuicao.col.fornecedor')}</th>
                        <th scope="col" style={{ ...th, textAlign: 'left' }}>{t('admin.distribuicao.col.capacidade')}</th>
                        <th scope="col" style={{ ...th, textAlign: 'right' }}>{t('admin.distribuicao.col.cota')}</th>
                        <th scope="col" style={{ ...th, textAlign: 'right' }}>{t('admin.distribuicao.col.percentual')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rateio.map((r) => (
                        <tr key={r.fornecedorId} data-cy="linha-rateio">
                          <td style={td}><span style={{ fontWeight: 600, color: 'var(--azul-900)' }}>{r.nome}</span></td>
                          <td style={{ ...td, color: 'var(--cinza-600, #52607a)' }}>{t('admin.distribuicao.capacidade', { cap: numero(r.capacidade) })}</td>
                          <td style={{ ...td, textAlign: 'right' }}><span style={{ fontWeight: 600, color: 'var(--azul-700)' }} data-cy="cota">{numero(r.cota)}</span></td>
                          <td style={{ ...td, textAlign: 'right', color: 'var(--cinza-500)' }} data-cy="percentual">{percentual(r.cota, data.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {(data.homologada || data.rateio.length > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '16px 20px', borderTop: '1px solid var(--divider)' }}>
                    {homologar.isError && <span role="alert" style={{ fontSize: 13, color: 'var(--erro, #c0392b)' }}>{t('admin.distribuicao.erroHomologar')}</span>}
                    {data.homologada ? (
                      <span data-cy="homologada-em" style={{ fontSize: 13.5, color: 'var(--sucesso)', fontWeight: 600 }}>
                        {t('admin.distribuicao.homologadaEm', { versao: data.versao ?? 1 })}
                      </span>
                    ) : (
                      <Botao data-cy="homologar" variante="primario" onClick={() => homologar.mutate()} disabled={homologar.isPending}>
                        {homologar.isPending ? t('admin.distribuicao.homologando') : t('admin.distribuicao.homologar')}
                      </Botao>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
