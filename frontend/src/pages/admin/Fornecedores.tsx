import { useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type FiltroFornecedoresView } from '../../lib/api';
import { celula, cabecalho, setaOrdem, Paginacao, type Direcao } from '../../design-system/tabela';
import { exportarCsv } from '../../lib/exportar';
import { Botao } from '../../design-system/components';
import { IconeBusca, IconeFiltro, IconeOrdenar, IconeDownload, IconeOlho, IconeLapis, IconeBloquear, IconeSeta } from '../../design-system/icons';
import { ModalFornecedor, type ModoModal } from './ModalFornecedor';

/**
 * Painel Admin · "Gestão de Fornecedores" (Operação — smga/administrador). Lista as empresas
 * cadastradas com busca, filtros, ordenação e paginação server-side (GET /admin/fornecedores). As
 * ações abrem o modal único (criar/ver/editar): criar via POST /admin/fornecedores; ver/editar reusam
 * o read model do portal (dados oficiais read-only, RN009; contato editável; re-sincronização RF018).
 *
 * Layout fiel a `spec/Prototipo/painel-administrativo.html`. Escolhas onde o mockup pede dado sem
 * lastro no domínio ("placeholder honesto"): coluna "Cap. produtiva" = "—" (capacidade é declarada por
 * edital, RN005); Status usa o vocabulário de credenciamento do domínio com as cores do mockup;
 * "Bloquear" fica desabilitado (o bloqueio por inadimplência é do módulo RN002).
 */
type Coluna = 'cnpj' | 'razaoSocial' | 'porte' | 'status';
const STATUS: readonly string[] = ['requerente', 'pendente_analise', 'credenciado', 'apto', 'em_correcao'];
const SITUACOES: readonly string[] = ['ativa', 'baixada', 'inapta', 'suspensa'];
const POR_PAGINA = 10;

/** 7 dígitos da subclasse → máscara Receita DDDD-D/DD (ex.: 1412601 → 1412-6/01). */
function formatarCnae(codigo: string | null): string {
  const d = (codigo ?? '').replace(/\D/g, '');
  return d.length === 7 ? `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}` : codigo ?? '—';
}

/** Tom da pill por status de credenciamento, nas cores do mockup. */
function tomStatus(status: string): { bg: string; fg: string } {
  if (status === 'credenciado' || status === 'apto') return { bg: 'var(--sucesso-bg)', fg: 'var(--sucesso)' };
  if (status === 'em_correcao') return { bg: 'var(--erro-bg)', fg: 'var(--erro-700)' };
  return { bg: 'var(--atencao-bg)', fg: '#8A5410' };
}

const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
const iconeAcao: CSSProperties = { width: 34, height: 34, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--cinza-500)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export function Fornecedores() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [situacao, setSituacao] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<Coluna | ''>('');
  const [direcao, setDirecao] = useState<Direcao>('asc');
  const [pagina, setPagina] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarOrdenar, setMostrarOrdenar] = useState(false);
  const [modal, setModal] = useState<{ modo: ModoModal; id?: string } | null>(null);

  const filtroBase: FiltroFornecedoresView = {
    busca: busca.trim() || undefined,
    status: status || undefined,
    situacao: situacao || undefined,
    ordenarPor: ordenarPor || undefined,
    direcao: ordenarPor ? direcao : undefined,
  };
  const filtro: FiltroFornecedoresView = { ...filtroBase, pagina, tamanho: POR_PAGINA };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fornecedores-admin', filtro],
    queryFn: () => api.fornecedoresAdminListar(filtro),
    placeholderData: keepPreviousData,
  });

  const itens = data?.itens ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const aoFiltrar = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPagina(1); };

  const rotuloStatus = (s: string) => (STATUS.includes(s) ? t(`admin.fornecedores.status.${s}`) : s);
  const rotuloSituacao = (s: string) => (SITUACOES.includes(s) ? t(`admin.fornecedores.situacao.${s}`) : s);

  const ordenarPorColuna = (c: Coluna) => {
    if (c === ordenarPor) setDirecao(direcao === 'asc' ? 'desc' : 'asc');
    else { setOrdenarPor(c); setDirecao('asc'); }
    setPagina(1);
  };

  // Exportação: percorre todas as páginas do filtro atual (sem truncar silenciosamente).
  const exportar = async () => {
    const limite = 100;
    const primeiro = await api.fornecedoresAdminListar({ ...filtroBase, pagina: 1, tamanho: limite });
    const linhas = [...primeiro.itens];
    const paginas = Math.ceil(primeiro.total / limite);
    for (let p = 2; p <= paginas; p++) {
      const r = await api.fornecedoresAdminListar({ ...filtroBase, pagina: p, tamanho: limite });
      linhas.push(...r.itens);
    }
    exportarCsv(
      [t('admin.fornecedores.campos.cnpj'), t('admin.fornecedores.campos.razaoSocial'), t('admin.fornecedores.campos.nomeFantasia'), t('admin.fornecedores.campos.porte'), t('admin.fornecedores.campos.cnaePrincipal'), t('admin.fornecedores.campos.status')],
      linhas.map((f) => [f.cnpj, f.razaoSocial, f.nomeFantasia ?? '', f.porte, formatarCnae(f.cnaePrincipal), rotuloStatus(f.status)]),
      'fornecedores.csv',
    );
  };

  const colunas: { chave: Coluna | null; rotulo: string; alinhamento?: CSSProperties['textAlign'] }[] = [
    { chave: 'cnpj', rotulo: t('admin.fornecedores.campos.cnpj') },
    { chave: 'razaoSocial', rotulo: t('admin.fornecedores.campos.razaoSocial') },
    { chave: 'porte', rotulo: t('admin.fornecedores.campos.porte') },
    { chave: null, rotulo: t('admin.fornecedores.campos.cnaePrincipal') },
    { chave: null, rotulo: t('admin.fornecedores.campos.capProdutiva') },
    { chave: 'status', rotulo: t('admin.fornecedores.campos.status') },
    { chave: null, rotulo: t('admin.fornecedores.campos.acoes'), alinhamento: 'right' },
  ];

  return (
    <div className="stack" data-cy="admin-fornecedores">
      {/* Cabeçalho + Novo fornecedor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{t('admin.fornecedores.titulo')}</h1>
          <p className="page-sub">{t('admin.fornecedores.subtitulo')}</p>
        </div>
        <Botao data-cy="novo-fornecedor" onClick={() => setModal({ modo: 'criar' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span>{t('admin.fornecedores.novoFornecedor')}
        </Botao>
      </div>

      {/* Toolbar: busca + Filtros/Ordenar/Exportar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconeBusca width={17} height={17} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--cinza-400)' }} />
          <input
            className="input"
            data-cy="busca"
            aria-label={t('admin.fornecedores.buscaAriaLabel')}
            placeholder={t('admin.fornecedores.buscaPlaceholder')}
            value={busca}
            onChange={(e) => aoFiltrar(setBusca)(e.target.value)}
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>
        <Botao data-cy="btn-filtros" variante="secundario" aria-expanded={mostrarFiltros} onClick={() => setMostrarFiltros((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IconeFiltro width={16} height={16} />{t('admin.fornecedores.filtros')}
        </Botao>
        <Botao data-cy="btn-ordenar" variante="secundario" aria-expanded={mostrarOrdenar} onClick={() => setMostrarOrdenar((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IconeOrdenar width={16} height={16} />{t('admin.fornecedores.ordenar')}
        </Botao>
        <Botao data-cy="btn-exportar" variante="secundario" disabled={total === 0} onClick={() => void exportar()} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IconeDownload width={16} height={16} style={{ color: 'var(--sucesso)' }} />{t('admin.fornecedores.exportar')}
        </Botao>
      </div>

      {/* Painel de filtros (colapsável) */}
      {mostrarFiltros && (
        <div className="card" data-cy="painel-filtros" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.fornecedores.campos.status')}
            <select className="input" data-cy="filtro-status" value={status} onChange={(e) => aoFiltrar(setStatus)(e.target.value)}>
              <option value="">{t('admin.fornecedores.filtroStatusTodos')}</option>
              {STATUS.map((s) => <option key={s} value={s}>{rotuloStatus(s)}</option>)}
            </select>
          </label>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.fornecedores.campos.situacao')}
            <select className="input" data-cy="filtro-situacao" value={situacao} onChange={(e) => aoFiltrar(setSituacao)(e.target.value)}>
              <option value="">{t('admin.fornecedores.filtroSituacaoTodas')}</option>
              {SITUACOES.map((s) => <option key={s} value={s}>{rotuloSituacao(s)}</option>)}
            </select>
          </label>
        </div>
      )}

      {/* Painel de ordenação (colapsável) */}
      {mostrarOrdenar && (
        <div className="card" data-cy="painel-ordenar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.fornecedores.ordenarPor')}
            <select className="input" data-cy="ordenar-por" value={ordenarPor} onChange={(e) => aoFiltrar(setOrdenarPor)(e.target.value as Coluna | '')}>
              <option value="">{t('admin.fornecedores.ordenacaoPadrao')}</option>
              {(['cnpj', 'razaoSocial', 'porte', 'status'] as Coluna[]).map((c) => <option key={c} value={c}>{t(`admin.fornecedores.campos.${c}`)}</option>)}
            </select>
          </label>
          <Botao data-cy="ordenar-direcao" variante="secundario" disabled={!ordenarPor} onClick={() => { setDirecao(direcao === 'asc' ? 'desc' : 'asc'); setPagina(1); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconeSeta width={15} height={15} style={{ transform: direcao === 'asc' ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
            {t(`admin.fornecedores.direcao.${direcao}`)}
          </Botao>
        </div>
      )}

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.fornecedores.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.fornecedores.erroCarregar')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {itens.length === 0 ? (
            <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.fornecedores.vazioTitulo')}</div>
              <div style={{ fontSize: 13.5 }}>{t('admin.fornecedores.vazioDica')}</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table data-cy="tabela-fornecedores" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                  <thead>
                    <tr>
                      {colunas.map((c) => {
                        const ativa = c.chave === ordenarPor && !!ordenarPor;
                        return (
                          <th key={c.rotulo} scope="col" style={cabecalho(!!c.chave, c.alinhamento)} aria-sort={ativa ? (direcao === 'asc' ? 'ascending' : 'descending') : undefined}>
                            {c.chave ? (
                              <button type="button" data-cy={`ordenar-col-${c.chave}`} onClick={() => ordenarPorColuna(c.chave as Coluna)} style={{ all: 'unset', cursor: 'pointer', font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}>
                                {c.rotulo}{setaOrdem(ativa, direcao)}
                              </button>
                            ) : c.rotulo}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((f) => {
                      const tom = tomStatus(f.status);
                      return (
                        <tr key={f.id} data-cy="item-fornecedor" data-id={f.id}>
                          <td style={{ ...celula, font: '600 13.5px var(--font-body)', color: 'var(--cinza-900)', whiteSpace: 'nowrap' }}>{f.cnpj}</td>
                          <td style={{ ...celula, minWidth: 200 }}>
                            <div style={{ font: '700 14px var(--font-body)', color: 'var(--azul-900)' }}>{f.nomeFantasia ?? f.razaoSocial}</div>
                            {f.nomeFantasia && <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--cinza-500)' }}>{f.razaoSocial}</div>}
                          </td>
                          <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-700)', whiteSpace: 'nowrap' }}>{f.porte}</td>
                          <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-700)', whiteSpace: 'nowrap' }}>{formatarCnae(f.cnaePrincipal)}</td>
                          <td data-cy="cap-produtiva" style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-400)', whiteSpace: 'nowrap' }} title={t('admin.fornecedores.capProdutivaIndisponivel')}>—</td>
                          <td style={celula}>
                            <span data-cy="status" style={{ ...pill, background: tom.bg, color: tom.fg }}>{rotuloStatus(f.status)}</span>
                          </td>
                          <td style={{ ...celula, textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button type="button" data-cy="ver-detalhes" title={t('admin.fornecedores.acao.ver')} aria-label={t('admin.fornecedores.acao.ver')} onClick={() => setModal({ modo: 'ver', id: f.id })} style={iconeAcao}>
                                <IconeOlho width={17} height={17} />
                              </button>
                              <button type="button" data-cy="editar" title={t('admin.fornecedores.acao.editar')} aria-label={t('admin.fornecedores.acao.editar')} onClick={() => setModal({ modo: 'editar', id: f.id })} style={iconeAcao}>
                                <IconeLapis width={16} height={16} />
                              </button>
                              <button type="button" data-cy="bloquear" disabled title={t('admin.fornecedores.acao.bloquearIndisponivel')} aria-label={t('admin.fornecedores.acao.bloquearIndisponivel')} style={{ ...iconeAcao, cursor: 'not-allowed', opacity: 0.5 }}>
                                <IconeBloquear width={16} height={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Paginacao
                info={t('admin.fornecedores.paginacaoInfo', { de: total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1, ate: Math.min(pagina * POR_PAGINA, total), total })}
                pagina={pagina}
                totalPaginas={totalPaginas}
                onPagina={setPagina}
                rotuloPagina={(n) => t('admin.fornecedores.irParaPagina', { n })}
              />
            </>
          )}
        </div>
      )}

      {modal && (
        <ModalFornecedor
          modo={modal.modo}
          id={modal.id}
          onFechar={() => setModal(null)}
          onMudou={() => qc.invalidateQueries({ queryKey: ['fornecedores-admin'] })}
        />
      )}
    </div>
  );
}
