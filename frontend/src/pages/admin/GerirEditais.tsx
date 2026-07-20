import { useMemo, useState, type CSSProperties } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type EditalGestao, type CatalogoItemView, type FiltroEditais } from '../../lib/api';
import { celula, cabecalho, Paginacao } from '../../design-system/tabela';
import { Botao, Campo } from '../../design-system/components';
import { IconeOlho, IconeFechar, IconeBusca, IconeFiltro } from '../../design-system/icons';

const POR_PAGINA = 10;

/**
 * Gestão de Editais (SGMA) — tela única de editais do Painel Admin em `/admin/editais` (FR-001/003/004).
 * Lista todos os editais (todas as secretarias/situações) via QBE sem probe; cria em rascunho (modal
 * "Novo edital"), publica e encerra. Layout fiel a `spec/Prototipo/painel-administrativo.html`: colunas
 * Edital (nº + CNAE), Objeto (+ quantitativo), Secretaria, Prazo, Status e Ações.
 *
 * Onde o mockup pede dado sem lastro no domínio ("placeholder honesto"): o protótipo exibia "Valor
 * estimado" — omitido, pois não existe no domínio e RN013 veda montantes. O `numero` oficial (ED-AAAA/NNN)
 * é gerado no backend ao criar (identificador humano, não montante); por isso o modal de criação não o
 * coleta. "Ver" abre um modal read-only com os dados da própria listagem (sem nova chamada).
 */

/** 7 dígitos da subclasse → máscara Receita DDDD-D/DD (ex.: 1412601 → 1412-6/01). */
function formatarCnae(codigo: string | undefined): string {
  const d = (codigo ?? '').replace(/\D/g, '');
  return d.length === 7 ? `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}` : codigo ?? '—';
}

/** Tom da pill por situação do edital (design system) — publicado=sucesso, rascunho=atenção, encerrado=info. */
function tomSituacao(situacao: string): { bg: string; fg: string } {
  if (situacao === 'publicado') return { bg: 'var(--sucesso-bg)', fg: 'var(--sucesso)' };
  if (situacao === 'encerrado') return { bg: 'var(--cinza-100)', fg: 'var(--cinza-500)' };
  return { bg: 'var(--atencao-bg)', fg: '#8A5410' };
}

const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
const iconeAcao: CSSProperties = { width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--cinza-600, #556)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export function GerirEditais() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [verId, setVerId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [secretariaFiltro, setSecretariaFiltro] = useState('');
  const [cnaeFiltro, setCnaeFiltro] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [pagina, setPagina] = useState(1);

  const filtro: FiltroEditais = {
    texto: busca.trim() || undefined,
    situacao: situacao || undefined,
    secretariaId: secretariaFiltro || undefined,
    cnae: cnaeFiltro.replace(/\D/g, '') || undefined, // backend casa por subclasse (só dígitos)
    page: pagina,
    size: POR_PAGINA,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gestao-editais', filtro],
    queryFn: () => api.buscarEditaisGestao(filtro),
    placeholderData: keepPreviousData,
  });
  const { data: secretarias } = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias') });
  const secretariasLista = (secretarias as CatalogoItemView[] | undefined) ?? [];

  const editais = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const temFiltro = Boolean(filtro.texto || filtro.situacao || filtro.secretariaId || filtro.cnae);

  // Toda mudança de filtro/busca volta à página 1 (senão o pager pode apontar página inexistente).
  const aoFiltrar = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPagina(1); };

  const invalidar = () => qc.invalidateQueries({ queryKey: ['gestao-editais'] });

  // Resolve secretariaId → sigla (o backend expõe só o id; o catálogo é a fonte da sigla).
  const siglaDe = useMemo(() => {
    const porId = new Map(secretariasLista.map((s) => [s.id, s.sigla ?? s.nome ?? s.id]));
    return (id: string) => porId.get(id) ?? id;
  }, [secretariasLista]);

  const criar = useMutation({
    mutationFn: (v: { objeto: string; secretariaId: string; cnae: string; quantitativos: number; prazo: string }) =>
      api.criarEdital({ secretariaId: v.secretariaId, objeto: v.objeto, cnaesAlvo: v.cnae.split(',').map((c) => c.trim()).filter(Boolean), quantitativos: v.quantitativos, prazoVigencia: v.prazo }),
    onSuccess: () => { setCriando(false); void invalidar(); },
  });
  const publicar = useMutation({ mutationFn: (id: string) => api.publicarEdital(id), onSuccess: () => void invalidar() });
  const encerrar = useMutation({ mutationFn: (id: string) => api.encerrarEdital(id), onSuccess: () => void invalidar() });

  const rotuloSituacao = (s: string) => t(`admin.gerirEditais.status.${s}`, { defaultValue: s });
  const formatarPrazo = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(i18n.language) : t('admin.gerirEditais.semPrazo'));

  const colunas: { rotulo: string; alinhamento?: CSSProperties['textAlign'] }[] = [
    { rotulo: t('admin.gerirEditais.colEdital') },
    { rotulo: t('admin.gerirEditais.colObjeto') },
    { rotulo: t('admin.gerirEditais.colSecretaria') },
    { rotulo: t('admin.gerirEditais.colPrazo') },
    { rotulo: t('admin.gerirEditais.colStatus') },
    { rotulo: t('admin.gerirEditais.colAcoes'), alinhamento: 'right' },
  ];

  const edital = verId ? editais.find((e) => e.id === verId) ?? null : null;

  return (
    <div className="stack" data-cy="admin-gestao-editais">
      {/* Cabeçalho + Novo edital */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.gerirEditais.eyebrow')}</div>
          <h1 className="page-title" style={{ margin: '4px 0 3px' }}>{t('admin.gerirEditais.titulo')}</h1>
          <p className="page-sub" style={{ margin: 0 }}>{t('admin.gerirEditais.subtitulo')}</p>
        </div>
        <Botao data-cy="novo-edital" onClick={() => setCriando(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span>{t('admin.gerirEditais.novoEdital')}
        </Botao>
      </div>

      {/* Toolbar: busca por número/objeto + botão de filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconeBusca width={19} height={19} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--cinza-400)' }} />
          <input
            className="input"
            data-cy="busca"
            aria-label={t('admin.gerirEditais.buscaAriaLabel')}
            placeholder={t('admin.gerirEditais.buscaPlaceholder')}
            value={busca}
            onChange={(e) => aoFiltrar(setBusca)(e.target.value)}
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>
        <Botao data-cy="btn-filtros" variante="secundario" aria-expanded={mostrarFiltros} onClick={() => setMostrarFiltros((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IconeFiltro width={18} height={18} />{t('admin.gerirEditais.filtros')}
        </Botao>
      </div>

      {/* Painel de filtros (colapsável): situação, secretaria e CNAE — todos server-side (QBE) */}
      {mostrarFiltros && (
        <div className="card" data-cy="painel-filtros" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.gerirEditais.colStatus')}
            <select className="input" data-cy="filtro-situacao" value={situacao} onChange={(e) => aoFiltrar(setSituacao)(e.target.value)}>
              <option value="">{t('admin.gerirEditais.filtroSituacaoTodas')}</option>
              {(['rascunho', 'publicado', 'encerrado'] as const).map((s) => <option key={s} value={s}>{rotuloSituacao(s)}</option>)}
            </select>
          </label>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.gerirEditais.colSecretaria')}
            <select className="input" data-cy="filtro-secretaria" value={secretariaFiltro} onChange={(e) => aoFiltrar(setSecretariaFiltro)(e.target.value)}>
              <option value="">{t('admin.gerirEditais.filtroSecretariaTodas')}</option>
              {secretariasLista.map((s) => <option key={s.id} value={s.id}>{s.sigla ?? s.nome ?? s.id}</option>)}
            </select>
          </label>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.gerirEditais.filtroCnaeLabel')}
            <input
              className="input"
              data-cy="filtro-cnae"
              inputMode="numeric"
              placeholder={t('admin.gerirEditais.filtroCnaePlaceholder')}
              value={cnaeFiltro}
              onChange={(e) => aoFiltrar(setCnaeFiltro)(e.target.value)}
            />
          </label>
          {temFiltro && (
            <Botao data-cy="limpar-filtros" variante="secundario" onClick={() => { setBusca(''); setSituacao(''); setSecretariaFiltro(''); setCnaeFiltro(''); setPagina(1); }}>
              {t('admin.gerirEditais.limparFiltros')}
            </Botao>
          )}
        </div>
      )}

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.gerirEditais.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.gerirEditais.erroCarregar')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {editais.length === 0 ? (
            <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t(temFiltro ? 'admin.gerirEditais.vazioFiltroTitulo' : 'admin.gerirEditais.vazioTitulo')}</div>
              <div style={{ fontSize: 13.5 }}>{t(temFiltro ? 'admin.gerirEditais.vazioFiltroDica' : 'admin.gerirEditais.vazioDica')}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table data-cy="tabela-editais" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                <thead>
                  <tr>
                    {colunas.map((c) => (
                      <th key={c.rotulo || 'acoes'} scope="col" style={cabecalho(false, c.alinhamento)}>{c.rotulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editais.map((e) => {
                    const tom = tomSituacao(e.situacao);
                    return (
                      <tr key={e.id} data-cy="item-edital" data-id={e.id}>
                        <td style={{ ...celula, whiteSpace: 'nowrap' }}>
                          <div style={{ font: '600 14px var(--font-body)', color: 'var(--azul-700)' }}>{e.numero}</div>
                          <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.gerirEditais.cnaePrefixo', { cnae: formatarCnae(e.cnaesAlvo[0]) })}</div>
                        </td>
                        <td style={{ ...celula, minWidth: 240 }}>
                          <div style={{ font: '500 14px var(--font-body)', color: 'var(--azul-900)', maxWidth: 320 }}>{e.objeto}</div>
                          <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.gerirEditais.unidades', { n: e.quantitativos })}</div>
                        </td>
                        <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-500)', whiteSpace: 'nowrap' }}>{siglaDe(e.secretariaId)}</td>
                        <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-500)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatarPrazo(e.prazoVigencia)}</td>
                        <td style={celula}>
                          <span data-cy="status" style={{ ...pill, background: tom.bg, color: tom.fg }}>{rotuloSituacao(e.situacao)}</span>
                        </td>
                        <td style={{ ...celula, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {e.situacao === 'rascunho' && (
                              <Botao data-cy="publicar" onClick={() => publicar.mutate(e.id)} disabled={publicar.isPending}>{t('admin.gerirEditais.publicar')}</Botao>
                            )}
                            {e.situacao === 'publicado' && (
                              <Botao data-cy="encerrar" variante="secundario" onClick={() => encerrar.mutate(e.id)} disabled={encerrar.isPending}>{t('admin.gerirEditais.encerrar')}</Botao>
                            )}
                            <button type="button" data-cy="ver-detalhes" title={t('admin.gerirEditais.acaoVer')} aria-label={t('admin.gerirEditais.acaoVer')} onClick={() => setVerId(e.id)} style={iconeAcao}>
                              <IconeOlho width={21} height={21} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {editais.length > 0 && (
            <Paginacao
              info={t('admin.gerirEditais.paginacaoInfo', { de: (pagina - 1) * POR_PAGINA + 1, ate: Math.min(pagina * POR_PAGINA, total), total })}
              pagina={pagina}
              totalPaginas={totalPaginas}
              onPagina={setPagina}
              rotuloPagina={(n) => t('admin.gerirEditais.irParaPagina', { n })}
            />
          )}
        </div>
      )}

      {edital && <ModalDetalhe edital={edital} sigla={siglaDe(edital.secretariaId)} prazo={formatarPrazo(edital.prazoVigencia)} rotuloSituacao={rotuloSituacao} onFechar={() => setVerId(null)} />}
      {criando && <ModalNovoEdital secretarias={secretariasLista} salvando={criar.isPending} onSalvar={(v) => criar.mutate(v)} onFechar={() => setCriando(false)} />}
    </div>
  );
}

/** Modal read-only com os dados do edital já disponíveis na listagem (sem nova chamada ao backend). */
function ModalDetalhe({ edital, sigla, prazo, rotuloSituacao, onFechar }: {
  edital: EditalGestao; sigla: string; prazo: string; rotuloSituacao: (s: string) => string; onFechar: () => void;
}) {
  const { t } = useTranslation();
  const linhas: [string, string][] = [
    [t('admin.gerirEditais.campoNumero'), edital.numero],
    [t('admin.gerirEditais.campoObjeto'), edital.objeto],
    [t('admin.gerirEditais.campoSecretaria'), sigla],
    [t('admin.gerirEditais.campoCnaes'), edital.cnaesAlvo.map(formatarCnae).join(', ') || '—'],
    [t('admin.gerirEditais.campoQuantitativos'), t('admin.gerirEditais.unidades', { n: edital.quantitativos })],
    [t('admin.gerirEditais.campoPrazo'), prazo],
    [t('admin.gerirEditais.campoStatus'), rotuloSituacao(edital.situacao)],
  ];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('admin.gerirEditais.modalTitulo')}
      data-cy="modal-edital"
      onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}
    >
      <div onClick={(ev) => ev.stopPropagation()} className="card" style={{ width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: 'var(--azul-900)' }}>{t('admin.gerirEditais.modalTitulo')}</h2>
          <button type="button" data-cy="fechar-modal" title={t('admin.gerirEditais.fechar')} aria-label={t('admin.gerirEditais.fechar')} onClick={onFechar} style={iconeAcao}>
            <IconeFechar width={18} height={18} />
          </button>
        </div>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '10px 16px' }}>
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} style={{ display: 'contents' }}>
              <dt style={{ fontSize: 13, color: 'var(--cinza-500)', whiteSpace: 'nowrap' }}>{rotulo}</dt>
              <dd style={{ margin: 0, fontSize: 13.5, color: 'var(--azul-900)' }}>{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/**
 * Modal "Novo edital" (criação em rascunho). O `numero` é gerado no backend ao salvar (FR-001), por isso
 * aqui só se mostra um aviso — não é campo editável. A secretaria demandante vem do catálogo (1 edital =
 * 1 secretaria, RN007). Objeto/CNAE(s)/quantitativo/prazo alimentam o domínio.
 */
function ModalNovoEdital({ secretarias, salvando, onSalvar, onFechar }: {
  secretarias: CatalogoItemView[];
  salvando: boolean;
  onSalvar: (v: { objeto: string; secretariaId: string; cnae: string; quantitativos: number; prazo: string }) => void;
  onFechar: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues: { objeto: '', secretariaId: '', cnae: '', quantitativos: 1, prazo: '' },
    onSubmit: ({ value }) => onSalvar(value),
  });
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('admin.gerirEditais.novoTitulo')}
      data-cy="modal-novo-edital"
      onClick={onFechar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }}
    >
      <div onClick={(ev) => ev.stopPropagation()} className="card" style={{ width: 'min(600px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--azul-900)' }}>{t('admin.gerirEditais.novoTitulo')}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--cinza-500)' }}>{t('admin.gerirEditais.novoSub')}</p>
          </div>
          <button type="button" data-cy="fechar-modal" title={t('admin.gerirEditais.fechar')} aria-label={t('admin.gerirEditais.fechar')} onClick={onFechar} style={iconeAcao}>
            <IconeFechar width={18} height={18} />
          </button>
        </div>

        <form data-cy="form-edital" onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }}>
          <Campo label={t('admin.gerirEditais.numeroLabel')} htmlFor="edital-numero">
            <input id="edital-numero" className="input" value={t('admin.gerirEditais.numeroAuto')} disabled readOnly />
          </Campo>

          <form.Field name="objeto">{(f) => (
            <Campo label={t('admin.gerirEditais.objetoLabel')} htmlFor="edital-objeto">
              <input id="edital-objeto" data-cy="objeto" className="input" placeholder={t('admin.gerirEditais.objetoPlaceholder')} value={f.state.value} onChange={(ev) => f.handleChange(ev.target.value)} />
            </Campo>
          )}</form.Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <form.Field name="secretariaId">{(f) => (
              <Campo label={t('admin.gerirEditais.secretariaLabel')} htmlFor="edital-secretaria">
                <select id="edital-secretaria" data-cy="secretaria" className="input" value={f.state.value} onChange={(ev) => f.handleChange(ev.target.value)}>
                  <option value="">{t('admin.gerirEditais.secretariaPlaceholder')}</option>
                  {secretarias.map((s) => (
                    <option key={s.id} value={s.id}>{s.sigla ?? s.nome ?? s.id}</option>
                  ))}
                </select>
              </Campo>
            )}</form.Field>
            <form.Field name="cnae">{(f) => (
              <Campo label={t('admin.gerirEditais.cnaeLabel')} htmlFor="edital-cnae">
                <input id="edital-cnae" data-cy="cnae" className="input" placeholder={t('admin.gerirEditais.cnaePlaceholder')} value={f.state.value} onChange={(ev) => f.handleChange(ev.target.value)} />
              </Campo>
            )}</form.Field>
          </div>
          <span style={{ display: 'block', margin: '-6px 0 12px', fontSize: 12, color: 'var(--cinza-500)' }}>{t('admin.gerirEditais.cnaeAjuda')}</span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <form.Field name="quantitativos">{(f) => (
              <Campo label={t('admin.gerirEditais.quantitativosLabel')} htmlFor="edital-quantitativos">
                <input id="edital-quantitativos" data-cy="quantitativos" className="input" type="number" min={1} value={f.state.value} onChange={(ev) => f.handleChange(Number(ev.target.value))} />
              </Campo>
            )}</form.Field>
            <form.Field name="prazo">{(f) => (
              <Campo label={t('admin.gerirEditais.prazoLabel')} htmlFor="edital-prazo">
                <input id="edital-prazo" data-cy="prazo" className="input" type="date" value={f.state.value} onChange={(ev) => f.handleChange(ev.target.value)} />
              </Campo>
            )}</form.Field>
          </div>

          <div data-cy="nota-soft-delete" style={{ display: 'flex', gap: 10, padding: '12px 14px', margin: '4px 0 18px', borderRadius: 10, background: 'var(--azul-50)', color: 'var(--azul-700)', fontSize: 13, lineHeight: 1.5 }}>
            <span aria-hidden>ℹ</span>
            <span>{t('admin.gerirEditais.softDeleteNota')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Botao type="button" variante="secundario" data-cy="cancelar" onClick={onFechar}>{t('admin.gerirEditais.cancelar')}</Botao>
            <Botao type="submit" data-cy="criar" disabled={salvando}>{t('admin.gerirEditais.salvar')}</Botao>
          </div>
        </form>
      </div>
    </div>
  );
}
