import { useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import { api, type EditalItem, type CatalogoItemView } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { diasAte, tomPrazo, CORES_PRAZO } from '../../lib/prazos';
import { exportarCsv } from '../../lib/exportar';
import { celula, siglaTag, botaoExportar, cabecalho, setaOrdem, Paginacao, type Direcao } from '../../design-system/tabela';
import { IconeBusca, IconeDownload, IconeInfo, IconeSeta } from '../../design-system/icons';

/** Colunas ordenáveis da vitrine. `prazo` ordena pelo nº de dias, não pelo texto. */
type Coluna = 'objeto' | 'secretaria' | 'prazo';

const POR_PAGINA = 5;

/** Edital da vitrine já resolvido para exibição (sigla da secretaria + prazo em dias). */
interface EditalLinha extends EditalItem {
  sigla: string;
  /** Dias até o fim da vigência; `null` quando o edital não tem prazo definido. */
  dias: number | null;
}

/**
 * Vitrine de Editais (UX-DR3) — apenas editais compatíveis com os CNAEs da empresa.
 *
 * Layout adaptado de `spec/AI-UI-Design/portal-fornecedor.html` (tabela + busca + filtro por secretaria
 * + ordenação + paginação). As colunas "Nº do edital" e "Valor estimado" do spec não existem no domínio:
 * o edital não tem número (só id) e RN013 veda expor valores — no lugar entram Objeto (âncora) e
 * Quantitativos (dado real). Busca, filtro, ordenação e paginação são client-side sobre a lista já filtrada
 * por CNAE no backend (UC003/RN001).
 */
export function Editais() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fornecedorId = obterUsuario()?.empresaId;

  const { data: editais = [], isLoading } = useQuery({ queryKey: ['editais'], queryFn: api.editaisCompativeis });
  const { data: secretarias } = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias') });
  const { data: perfil } = useQuery({ queryKey: ['fornecedor', fornecedorId], queryFn: () => api.fornecedor(fornecedorId as string), enabled: !!fornecedorId });

  const [busca, setBusca] = useState('');
  const [secretariaFiltro, setSecretariaFiltro] = useState('all');
  const [ordem, setOrdem] = useState<Coluna>('prazo');
  const [direcao, setDirecao] = useState<Direcao>('asc');
  const [pagina, setPagina] = useState(1);

  // Resolve secretariaId → sigla (o backend expõe só o id; o catálogo é a fonte da sigla).
  const siglaDe = useMemo(() => {
    const porId = new Map((secretarias as CatalogoItemView[] | undefined)?.map((s) => [s.id, s.sigla ?? s.nome ?? s.id]) ?? []);
    return (id: string) => porId.get(id) ?? id;
  }, [secretarias]);

  const linhas: EditalLinha[] = useMemo(
    () => editais.map((e) => ({ ...e, sigla: siglaDe(e.secretariaId), dias: e.prazoVigencia ? diasAte(e.prazoVigencia) : null })),
    [editais, siglaDe],
  );

  // Secretarias presentes na vitrine — o filtro só oferece o que existe na lista compatível.
  const opcoesSecretaria = useMemo(() => {
    const vistas = new Map(linhas.map((e) => [e.secretariaId, e.sigla]));
    return [...vistas].map(([id, sigla]) => ({ id, sigla })).sort((a, b) => a.sigla.localeCompare(b.sigla));
  }, [linhas]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const encontrou = (e: EditalLinha) => !termo || `${e.objeto} ${e.sigla}`.toLowerCase().includes(termo);
    const daSecretaria = (e: EditalLinha) => secretariaFiltro === 'all' || e.secretariaId === secretariaFiltro;

    // A direção entra no comparador (e não como `reverse()`) para que "sem prazo" fique sempre no fim.
    const sentido = direcao === 'asc' ? 1 : -1;
    const comparar = (a: EditalLinha, b: EditalLinha) => {
      if (ordem === 'prazo') {
        if (a.dias === null || b.dias === null) return a.dias === b.dias ? 0 : a.dias === null ? 1 : -1;
        return (a.dias - b.dias) * sentido;
      }
      const campo = ordem === 'objeto' ? 'objeto' : 'sigla';
      return a[campo].localeCompare(b[campo]) * sentido;
    };

    return linhas.filter((e) => encontrou(e) && daSecretaria(e)).sort(comparar);
  }, [linhas, busca, secretariaFiltro, ordem, direcao]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  // Qualquer mudança de filtro/busca volta para a primeira página.
  const aoFiltrar = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPagina(1); };

  const ordenarPor = (c: Coluna) => {
    if (c === ordem) setDirecao(direcao === 'asc' ? 'desc' : 'asc');
    else { setOrdem(c); setDirecao('asc'); }
    setPagina(1);
  };

  const textoPrazo = (dias: number | null) => {
    if (dias === null) return t('editais.vitrine.semPrazo');
    if (dias < 0) return t('editais.vitrine.prazoEncerrado');
    if (dias === 0) return t('editais.vitrine.prazoHoje');
    return t('editais.vitrine.prazoDias', { count: dias });
  };

  const colunas: { chave: Coluna | null; rotulo: string; alinhamento?: CSSProperties['textAlign'] }[] = [
    { chave: 'objeto', rotulo: t('editais.vitrine.colObjeto') },
    { chave: 'secretaria', rotulo: t('editais.vitrine.colSecretaria') },
    { chave: 'prazo', rotulo: t('editais.vitrine.colPrazo') },
    { chave: null, rotulo: '', alinhamento: 'right' },
  ];

  // Exporta o que está filtrado/ordenado (não só a página), espelhando o que o usuário vê.
  const exportar = () => exportarCsv(
    colunas.filter((c) => c.chave).map((c) => c.rotulo),
    filtrados.map((e) => [e.objeto, e.sigla, textoPrazo(e.dias)]),
    'editais.csv',
  );

  const cnaePrincipal = perfil?.cnaes?.find((c) => c.tipo === 'principal' && c.ativo) ?? perfil?.cnaes?.find((c) => c.ativo);

  return (
    <div className="stack">
      <div className="cm-page-head">
        <div>
          <h1 className="cm-page-title" style={{ fontSize: 22, color: 'var(--azul-900)', margin: 0 }}>
            {t('editais.vitrine.titulo')}
          </h1>
          <p className="cm-page-sub" style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--cinza-500)' }}>
            {t('editais.vitrine.subtitulo')}
          </p>
        </div>
      </div>

      {cnaePrincipal && (
        <div
          data-cy="banner-cnae"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0', background: 'var(--info-bg)',
            border: '1px solid var(--azul-100)', borderRadius: 11, padding: '12px 16px',
            color: 'var(--azul-700)', fontSize: 13.5,
          }}
        >
          <IconeInfo width={18} height={18} style={{ flexShrink: 0 }} />
          <span>
            <Trans i18nKey="editais.vitrine.bannerCnae" values={{ cnae: cnaePrincipal.codigoSubclasse }} components={{ 1: <strong /> }} />
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, margin: '18px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconeBusca
            width={17}
            height={17}
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--cinza-400)' }}
          />
          <input
            className="input"
            aria-label={t('editais.vitrine.buscaAriaLabel')}
            value={busca}
            onChange={(e) => aoFiltrar(setBusca)(e.target.value)}
            placeholder={t('editais.vitrine.buscaPlaceholder')}
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>

        <select
          data-cy="filtro-secretaria"
          aria-label={t('editais.vitrine.filtroSecretariaAriaLabel')}
          className="input"
          value={secretariaFiltro}
          onChange={(e) => aoFiltrar(setSecretariaFiltro)(e.target.value)}
          style={{ width: 'auto', cursor: 'pointer' }}
        >
          <option value="all">{t('editais.vitrine.todasSecretarias')}</option>
          {opcoesSecretaria.map((s) => <option key={s.id} value={s.id}>{s.sigla}</option>)}
        </select>

        <button type="button" data-cy="exportar-csv" onClick={exportar} disabled={filtrados.length === 0} style={botaoExportar}>
          <IconeDownload width={16} height={16} style={{ color: 'var(--sucesso)' }} />
          {t('editais.vitrine.exportarCsv')}
        </button>
        <button type="button" data-cy="exportar-pdf" onClick={() => window.print()} disabled={filtrados.length === 0} style={botaoExportar}>
          <IconeDownload width={16} height={16} style={{ color: 'var(--erro)' }} />
          {t('editais.vitrine.exportarPdf')}
        </button>
      </div>

      {isLoading ? (
        <p data-cy="carregando">{t('editais.vitrine.carregando')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtrados.length === 0 ? (
            <div data-cy="estado-vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>
                {busca.trim() || secretariaFiltro !== 'all' ? t('editais.vitrine.vazioBuscaTitulo') : t('editais.vitrine.vazioTitulo')}
              </div>
              <div style={{ fontSize: 13.5 }}>
                {busca.trim() || secretariaFiltro !== 'all' ? t('editais.vitrine.vazioBuscaDica') : t('editais.vitrine.vazioDica')}
              </div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table data-cy="tabela-editais" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                  <thead>
                    <tr>
                      {colunas.map((c) => {
                        const ativa = c.chave === ordem;
                        return (
                          <th
                            key={c.rotulo || 'acoes'}
                            scope="col"
                            style={cabecalho(!!c.chave, c.alinhamento)}
                            aria-sort={ativa ? (direcao === 'asc' ? 'ascending' : 'descending') : undefined}
                          >
                            {c.chave ? (
                              <button
                                type="button"
                                data-cy={`ordenar-${c.chave}`}
                                onClick={() => ordenarPor(c.chave as Coluna)}
                                style={{ all: 'unset', cursor: 'pointer', font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}
                              >
                                {c.rotulo}{setaOrdem(ativa, direcao)}
                              </button>
                            ) : c.rotulo}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((e) => (
                      <tr key={e.id} data-cy="edital-item" data-compativel="true">
                        <td style={{ ...celula, fontSize: 14, color: 'var(--cinza-900)', minWidth: 240 }}>{e.objeto}</td>
                        <td style={celula}><span style={siglaTag}>{e.sigla}</span></td>
                        <td style={celula}>
                          <span
                            className="pill"
                            data-cy="prazo"
                            style={{ ...(e.dias === null ? { color: 'var(--cinza-500)', background: 'var(--cinza-100)' } : CORES_PRAZO[e.dias < 0 ? 'urgente' : tomPrazo(e.dias)]) }}
                          >
                            {textoPrazo(e.dias)}
                          </span>
                        </td>
                        <td style={{ ...celula, textAlign: 'right' }}>
                          <button
                            type="button"
                            data-cy="iniciar-credenciamento"
                            className="btn btn-primary"
                            onClick={() => navigate({ to: '/credenciamento/$editalId', params: { editalId: e.id } })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
                          >
                            {t('editais.vitrine.iniciar')}
                            <IconeSeta width={15} height={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Paginacao
                info={t('editais.vitrine.paginacaoInfo', {
                  de: (paginaAtual - 1) * POR_PAGINA + 1,
                  ate: Math.min(paginaAtual * POR_PAGINA, filtrados.length),
                  total: filtrados.length,
                })}
                pagina={paginaAtual}
                totalPaginas={totalPaginas}
                onPagina={setPagina}
                rotuloPagina={(n) => t('editais.vitrine.irParaPagina', { n })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
