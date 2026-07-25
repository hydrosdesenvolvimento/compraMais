import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoItemView } from '../../lib/api';
import { Botao, BotaoIcone } from '../../design-system/components';
import { celula, cabecalho } from '../../design-system/tabela';
import { IconeBusca, IconeFechar } from '../../design-system/icons';

/**
 * Painel Admin · "Distribuição Inteligente" (Operação — SMGA/CPL). Lista os editais publicados (com
 * filtros por texto e secretaria) e abre os detalhes do rateio equitativo do Motor (UC008 / RF005 /
 * RN005) em um MODAL: totais, aviso de déficit, rateio POR ITEM e "Homologar" (congela a matriz
 * append-only). O preview determinístico (`homologada=false`) vira matriz homologada ao confirmar.
 * As unidades ("conjuntos", "un/mês") são de exibição — o domínio guarda apenas números.
 */

const chip: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
const stat: CSSProperties = { textAlign: 'center' };
const statLabel: CSSProperties = { fontSize: 12.5, color: 'var(--cinza-500)' };
const statValor: CSSProperties = { fontWeight: 600, fontSize: 22, color: 'var(--azul-900)', marginTop: 4 };
const th: CSSProperties = { padding: '13px 20px', font: '600 11px var(--font-body)', letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--cinza-500)', background: '#E2E7EE' };
const td: CSSProperties = { padding: '15px 20px', borderTop: '1px solid var(--divider)', fontSize: 14 };
const overlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 };
const cardModal: CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(760px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,.25)' };

export function DistribuicaoInteligente() {
  const { t } = useTranslation();
  const [texto, setTexto] = useState('');
  const [secretariaFiltro, setSecretariaFiltro] = useState('');
  const [editalSelecionado, setEditalSelecionado] = useState<string | null>(null);

  const { data: editais = [], isLoading, isError } = useQuery({
    queryKey: ['distribuicao-editais-publicados'],
    queryFn: () => api.editaisOperacao('publicado'),
  });
  const secretarias = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias'), staleTime: 5 * 60_000 });
  const secretariasLista = (secretarias.data as CatalogoItemView[] | undefined) ?? [];
  const siglaDe = (id: string): string => { const s = secretariasLista.find((x) => x.id === id); return s?.sigla ?? s?.nome ?? id; };

  // O filtro só oferece as secretarias que têm edital publicado na lista.
  const secretariasPresentes = useMemo(() => {
    const ids = [...new Set(editais.map((e) => e.secretariaId))];
    return ids.map((id) => ({ id, sigla: siglaDe(id) })).sort((a, b) => a.sigla.localeCompare(b.sigla));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editais, secretarias.data]);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return editais.filter((e) =>
      (!secretariaFiltro || e.secretariaId === secretariaFiltro) &&
      (!q || `${e.numero} ${e.objeto}`.toLowerCase().includes(q)),
    );
  }, [editais, texto, secretariaFiltro]);

  return (
    <div className="stack" data-cy="admin-distribuicao">
      <div>
        <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.distribuicao.eyebrow')}</div>
        <h1 className="page-title">{t('admin.distribuicao.titulo')}</h1>
        <p className="page-sub">{t('admin.distribuicao.subtitulo')}</p>
      </div>

      {isLoading ? (
        <p data-cy="carregando-editais" className="page-sub">{t('admin.distribuicao.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.distribuicao.erroCarregar')}</p>
      ) : editais.length === 0 ? (
        <div data-cy="sem-editais" className="card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
          {t('admin.distribuicao.semEditais')}
        </div>
      ) : (
        <>
          {/* Filtros: busca por número/objeto + secretaria */}
          <div data-cy="filtros" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', flex: '1 1 240px', maxWidth: 340 }}>
              <IconeBusca width={16} height={16} stroke="var(--cinza-400)" />
              <input data-cy="filtro-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={t('admin.distribuicao.filtros.texto')} aria-label={t('admin.distribuicao.filtros.texto')} style={{ border: 'none', outline: 'none', padding: '11px 0', width: '100%', background: 'transparent', fontSize: 14 }} />
            </span>
            <select data-cy="filtro-secretaria" className="input" value={secretariaFiltro} onChange={(e) => setSecretariaFiltro(e.target.value)} aria-label={t('admin.distribuicao.filtros.secretaria')} style={{ maxWidth: 220 }}>
              <option value="">{t('admin.distribuicao.filtros.todas')}</option>
              {secretariasPresentes.map((s) => <option key={s.id} value={s.id}>{s.sigla}</option>)}
            </select>
            <span style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginLeft: 'auto' }} data-cy="mostrando">{t('admin.distribuicao.mostrando', { n: filtrados.length, total: editais.length })}</span>
          </div>

          {/* Lista de editais publicados */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtrados.length === 0 ? (
              <div data-cy="sem-resultados" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>{t('admin.distribuicao.semResultados')}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th scope="col" style={cabecalho(false)}>{t('admin.distribuicao.lista.edital')}</th>
                      <th scope="col" style={cabecalho(false)}>{t('admin.distribuicao.lista.objeto')}</th>
                      <th scope="col" style={cabecalho(false)}>{t('admin.distribuicao.lista.secretaria')}</th>
                      <th scope="col" style={cabecalho(false)}>{t('admin.distribuicao.lista.itens')}</th>
                      <th scope="col" style={cabecalho(false, 'right')}>{t('admin.distribuicao.lista.acoes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((e) => (
                      <tr key={e.id} data-cy="item-edital" data-id={e.id}>
                        <td style={{ ...celula, font: '700 14px var(--font-body)', color: 'var(--azul-900)', whiteSpace: 'nowrap' }}>{e.numero}</td>
                        <td style={{ ...celula, color: 'var(--cinza-700)', maxWidth: 340 }}>{e.objeto}</td>
                        <td style={{ ...celula, color: 'var(--cinza-500)', whiteSpace: 'nowrap' }}>{siglaDe(e.secretariaId)}</td>
                        <td style={{ ...celula, color: 'var(--cinza-500)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{e.qtdItens !== undefined ? t('admin.distribuicao.itensContagem', { count: e.qtdItens }) : '—'}</td>
                        <td style={{ ...celula, textAlign: 'right' }}>
                          <Botao data-cy="ver-distribuicao" variante="secundario" onClick={() => setEditalSelecionado(e.id)}>{t('admin.distribuicao.verDistribuicao')}</Botao>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {editalSelecionado && <ModalDistribuicao editalId={editalSelecionado} onFechar={() => setEditalSelecionado(null)} />}
    </div>
  );
}

/** Modal com os detalhes do rateio de um edital: totais, déficit, rateio por item e homologação. */
function ModalDistribuicao({ editalId, onFechar }: { editalId: string; onFechar: () => void }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const { data, isLoading, isError } = useQuery({ queryKey: ['distribuicao-resumo', editalId], queryFn: () => api.resumoDistribuicao(editalId) });
  const homologar = useMutation({
    mutationFn: () => api.homologarDistribuicao(editalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['distribuicao-resumo', editalId] }),
  });

  const numero = (n: number): string => new Intl.NumberFormat(i18n.language).format(n);
  const percentual = (cota: number, base: number): string =>
    base > 0 ? new Intl.NumberFormat(i18n.language, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(cota / base) : '—';

  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={cardModal} role="dialog" aria-modal="true" aria-label={t('admin.distribuicao.modalTitulo')} data-cy="modal-distribuicao" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <div style={{ font: '600 12px var(--font-body)', color: 'var(--azul-700)' }}>{data?.edital.numero ?? t('admin.distribuicao.modalTitulo')}</div>
            <h2 style={{ margin: '2px 0 0', fontSize: 18, color: 'var(--azul-900)' }}>{data?.edital.objeto ?? ''}</h2>
            {data && <div style={{ fontSize: 13, color: 'var(--cinza-500)', marginTop: 2 }}>{data.edital.secretariaSigla ?? '—'}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data && (
              <span data-cy="chip-situacao" style={{ ...chip, ...(data.homologada ? { background: 'var(--sucesso-bg)', color: 'var(--sucesso)' } : { background: 'var(--azul-50)', color: 'var(--azul-700)' }) }}>
                {data.homologada ? t('admin.distribuicao.chip.homologada') : t('admin.distribuicao.chip.emDistribuicao')}
              </span>
            )}
            <BotaoIcone icone={IconeFechar} variante="fechar" onClick={onFechar} data-cy="fechar-modal" aria-label={t('admin.distribuicao.fechar')} title={t('admin.distribuicao.fechar')} />
          </div>
        </header>

        <div style={{ padding: 22, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {isError ? (
            <p data-cy="erro-modal" role="alert" style={{ color: 'var(--erro, #c0392b)', margin: 0 }}>{t('admin.distribuicao.erroCarregar')}</p>
          ) : isLoading || !data ? (
            <p data-cy="carregando" className="page-sub" style={{ margin: 0 }}>{t('admin.distribuicao.carregando')}</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '16px 0', borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)' }}>
                <div style={stat}><div style={statLabel}>{t('admin.distribuicao.stats.total')}</div><div style={statValor} data-cy="stat-total">{numero(data.total)}</div></div>
                <div style={stat}><div style={statLabel}>{t('admin.distribuicao.stats.distribuido')}</div><div style={{ ...statValor, color: 'var(--sucesso)' }} data-cy="stat-distribuido">{numero(data.distribuido)}</div></div>
                <div style={stat}><div style={statLabel}>{t('admin.distribuicao.stats.habilitados')}</div><div style={statValor} data-cy="stat-habilitados">{numero(data.habilitados)}</div></div>
              </div>

              {data.deficit && (
                <div data-cy="aviso-deficit" style={{ display: 'flex', gap: 12, background: 'var(--atencao-bg)', border: '1px solid var(--atencao)', borderRadius: 12, padding: '15px 18px', fontSize: 13, lineHeight: 1.5, color: '#8A5410' }}>
                  {t('admin.distribuicao.deficitAviso', { total: numero(data.total), distribuido: numero(data.distribuido), deficit: numero(data.deficitQuantidade) })}
                </div>
              )}

              <div style={{ font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>{t('admin.distribuicao.resultadoTitulo')}</div>
              {data.itens.length === 0 ? (
                <div data-cy="vazio" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
                  <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.distribuicao.vazioTitulo')}</div>
                  <div style={{ fontSize: 13.5 }}>{t('admin.distribuicao.vazioDica')}</div>
                </div>
              ) : (
                data.itens.map((item) => (
                  <div key={item.itemId} data-cy="item-distribuicao" data-id={item.itemId} data-deficit={item.deficit} style={{ border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--divider)' }}>
                      <span style={{ font: '600 14px var(--font-body)', color: 'var(--azul-900)' }}>
                        <span style={{ color: 'var(--azul-700)', fontVariantNumeric: 'tabular-nums' }}>{String(item.numero).padStart(2, '0')}</span> · {item.nome}
                      </span>
                      <span style={{ fontSize: 12.5, color: 'var(--cinza-500)' }}>
                        {t('admin.distribuicao.itemResumo', { distribuido: numero(item.distribuido), demanda: numero(item.demanda), unidade: item.unidade })}
                        {item.deficit && <span data-cy="item-deficit" style={{ marginLeft: 8, color: '#8A5410', fontWeight: 600 }}>· {t('admin.distribuicao.itemDeficit', { deficit: numero(item.deficitQuantidade) })}</span>}
                      </span>
                    </div>
                    {item.rateio.length === 0 ? (
                      <div data-cy="item-sem-rateio" style={{ padding: '20px', textAlign: 'center', color: 'var(--cinza-500)', fontSize: 13 }}>{t('admin.distribuicao.itemSemRateio')}</div>
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
                          {item.rateio.map((r) => (
                            <tr key={r.fornecedorId} data-cy="linha-rateio">
                              <td style={td}><span style={{ fontWeight: 600, color: 'var(--azul-900)' }}>{r.nome}</span></td>
                              <td style={{ ...td, color: 'var(--cinza-600, #52607a)' }}>{t('admin.distribuicao.capacidade', { cap: numero(r.capacidade) })}</td>
                              <td style={{ ...td, textAlign: 'right' }}><span style={{ fontWeight: 600, color: 'var(--azul-700)' }} data-cy="cota">{numero(r.cota)}</span></td>
                              <td style={{ ...td, textAlign: 'right', color: 'var(--cinza-500)' }} data-cy="percentual">{percentual(r.cota, item.demanda)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Rodapé: homologar / homologada — vale para o edital inteiro. */}
        {data && (data.homologada || data.distribuido > 0) && (
          <footer style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, padding: '14px 22px', borderTop: '1px solid var(--divider)', background: 'var(--cinza-100)', borderRadius: '0 0 16px 16px' }}>
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
          </footer>
        )}
      </div>
    </div>
  );
}
