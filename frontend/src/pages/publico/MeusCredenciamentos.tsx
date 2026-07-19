import { useMemo, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api, type CredenciamentoResumoView } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { exportarCsv } from '../../lib/exportar';
import { celula, botaoExportar, cabecalho, setaOrdem, Paginacao, type Direcao } from '../../design-system/tabela';
import { IconeBusca, IconeDownload, IconeSeta, IconeFechar } from '../../design-system/icons';

/** Colunas ordenáveis. `criadoEm`/`atualizadoEm` ordenam por data (ISO), não pelo texto exibido. */
type Coluna = 'numero' | 'objeto' | 'estado' | 'criadoEm' | 'atualizadoEm';
type Filtro = 'all' | 'iniciado' | 'aceito' | 'cancelado';

const POR_PAGINA = 5;

/**
 * Aparência e ação primária de cada estado do credenciamento (protótipo `spec/Prototipo/portal-fornecedor.html`).
 *
 * O protótipo mostra 4 chips (Todos / Em andamento / Finalizados / Cancelados); o domínio (UC004) tem 3
 * estados — não há "Não iniciado" porque o credenciamento só nasce quando o fornecedor declara a
 * capacidade (RN005). Cada estado tem uma ação primária:
 *  - `iniciado`  → "Continuar": reabre o wizard do edital de onde parou (Etapa n/N).
 *  - `aceito`    → "Visualizar": abre o detalhe read-only do credenciamento concluído (termo RN016).
 *  - `cancelado` → "Credenciar novamente": inicia um NOVO credenciamento — o backend só barra
 *                  duplicidade quando há um ativo, e cancelado não é ativo. (Cancelar é terminal.)
 *
 * O `×` de cancelar (A2) aparece só em `iniciado`, como no protótipo — o finalizado sai por "Visualizar".
 */
type AcaoEstado = 'continuar' | 'visualizar' | 'recredenciar';
const ESTADOS: Record<CredenciamentoResumoView['estado'], { bg: string; fg: string; dot: string; acao: AcaoEstado }> = {
  iniciado: { bg: 'var(--atencao-bg)', fg: '#8A5410', dot: 'var(--atencao)', acao: 'continuar' },
  aceito: { bg: 'var(--sucesso-bg)', fg: 'var(--sucesso)', dot: 'var(--sucesso)', acao: 'visualizar' },
  cancelado: { bg: 'var(--erro-bg)', fg: 'var(--erro-700)', dot: 'var(--erro)', acao: 'recredenciar' },
};

const pill: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999,
  font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap',
};

const botaoCancelar: CSSProperties = {
  width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8, background: '#fff',
  color: 'var(--cinza-500)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

/**
 * Meus Credenciamentos (UC004) — acompanha os credenciamentos da empresa e retoma o que está em andamento.
 *
 * Layout adaptado de `spec/Prototipo/portal-fornecedor.html` (chips com contagem + busca + export +
 * tabela ordenável + paginação). O subtítulo do objeto mostra "SIGLA · Etapa n/N" (passo do wizard
 * persistido no domínio, UC004). Divergência deliberada em relação ao protótipo: o total de passos é
 * 4/4, não 5/5 — a prova de vida/UC007 está fora do MVP. Busca, filtro, ordenação e paginação são
 * client-side sobre a lista do fornecedor.
 */
export function MeusCredenciamentos({ fornecedorId }: { fornecedorId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // `incluirCancelados`: a tela tem filtro dedicado a cancelados, então pede o histórico completo
  // (a home usa o recorte padrão, sem cancelados).
  const { data: credenciamentos = [], isLoading } = useQuery({
    queryKey: ['meus-credenciamentos', fornecedorId, 'todos'],
    queryFn: () => api.meusCredenciamentos(fornecedorId, true),
  });

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('all');
  const [ordem, setOrdem] = useState<Coluna>('atualizadoEm');
  const [direcao, setDirecao] = useState<Direcao>('desc'); // mais recentes primeiro (default do spec)
  const [pagina, setPagina] = useState(1);

  const cancelar = useMutation({
    mutationFn: (id: string) => api.cancelarCredenciamento(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['meus-credenciamentos', fornecedorId] }); },
  });

  const rotuloEstado = (e: CredenciamentoResumoView['estado']) => t(`meusCredenciamentos.estado.${e}`);
  const sigla = (c: CredenciamentoResumoView) => c.secretariaSigla ?? '—';
  const numero = (c: CredenciamentoResumoView) => c.numeroEdital ?? '—';
  const objeto = (c: CredenciamentoResumoView) => c.objeto ?? t('meusCredenciamentos.editalRemovido');

  // Data no formato do spec: DD/MM/AAAA · HH:MM, no fuso do usuário.
  const formatarData = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()} · ${hh}:${mi}`;
  };

  const contagem = useMemo(() => ({
    all: credenciamentos.length,
    iniciado: credenciamentos.filter((c) => c.estado === 'iniciado').length,
    aceito: credenciamentos.filter((c) => c.estado === 'aceito').length,
    cancelado: credenciamentos.filter((c) => c.estado === 'cancelado').length,
  }), [credenciamentos]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const encontrou = (c: CredenciamentoResumoView) =>
      !termo || `${numero(c)} ${objeto(c)} ${sigla(c)}`.toLowerCase().includes(termo);
    const noFiltro = (c: CredenciamentoResumoView) => filtro === 'all' || c.estado === filtro;

    const sentido = direcao === 'asc' ? 1 : -1;
    const comparar = (a: CredenciamentoResumoView, b: CredenciamentoResumoView) => {
      if (ordem === 'criadoEm' || ordem === 'atualizadoEm') {
        return (Date.parse(a[ordem]) - Date.parse(b[ordem])) * sentido;
      }
      const texto = (c: CredenciamentoResumoView) =>
        ordem === 'numero' ? numero(c) : ordem === 'objeto' ? objeto(c) : rotuloEstado(c.estado);
      return texto(a).localeCompare(texto(b)) * sentido;
    };

    return credenciamentos.filter((c) => encontrou(c) && noFiltro(c)).sort(comparar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credenciamentos, busca, filtro, ordem, direcao, t]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const aoFiltrar = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPagina(1); };

  const ordenarPor = (c: Coluna) => {
    if (c === ordem) setDirecao(direcao === 'asc' ? 'desc' : 'asc');
    else { setOrdem(c); setDirecao('asc'); }
    setPagina(1);
  };

  const colunas: { chave: Coluna | null; rotulo: string; alinhamento?: CSSProperties['textAlign'] }[] = [
    { chave: 'numero', rotulo: t('meusCredenciamentos.colEdital') },
    { chave: 'objeto', rotulo: t('meusCredenciamentos.colObjeto') },
    { chave: 'estado', rotulo: t('meusCredenciamentos.colStatus') },
    { chave: 'criadoEm', rotulo: t('meusCredenciamentos.colCriadoEm') },
    { chave: 'atualizadoEm', rotulo: t('meusCredenciamentos.colAtualizadoEm') },
    { chave: null, rotulo: t('meusCredenciamentos.colAcoes'), alinhamento: 'right' },
  ];

  const chips: { chave: Filtro; rotulo: string; total: number }[] = [
    { chave: 'all', rotulo: t('meusCredenciamentos.filtro.todos'), total: contagem.all },
    { chave: 'iniciado', rotulo: t('meusCredenciamentos.filtro.andamento'), total: contagem.iniciado },
    { chave: 'aceito', rotulo: t('meusCredenciamentos.filtro.finalizados'), total: contagem.aceito },
    { chave: 'cancelado', rotulo: t('meusCredenciamentos.filtro.cancelados'), total: contagem.cancelado },
  ];

  // Exporta o que está filtrado/ordenado (não só a página), espelhando o que o usuário vê.
  const exportar = () => exportarCsv(
    colunas.filter((c) => c.chave).map((c) => c.rotulo),
    filtrados.map((c) => [numero(c), objeto(c), sigla(c), rotuloEstado(c.estado), formatarData(c.criadoEm), formatarData(c.atualizadoEm)]),
    'meus-credenciamentos.csv',
  );

  const irParaWizard = (editalId: string) => navigate({ to: '/credenciamento/$editalId', params: { editalId } });
  const irParaDetalhe = (id: string) => navigate({ to: '/credenciamentos/$id', params: { id } });

  // Subtítulo do objeto (protótipo): "SIGLA · Etapa n/N". A etapa acompanha o passo do wizard nos
  // ativos; no cancelado fica só a sigla (o passo congelou e não há para onde continuar).
  const subObjeto = (c: CredenciamentoResumoView): string | null => {
    const sig = c.secretariaSigla;
    if (c.estado === 'cancelado') return sig;
    const etapa = t('meusCredenciamentos.etapa', { atual: c.passoAtual, total: c.totalPassos });
    return sig ? `${sig} · ${etapa}` : etapa;
  };

  return (
    <div className="stack" data-cy="meus-credenciamentos">
      <div className="cm-page-head">
        <div>
          <h1 className="cm-page-title" style={{ fontSize: 22, color: 'var(--azul-900)', margin: 0 }}>
            {t('meusCredenciamentos.titulo')}
          </h1>
          <p className="cm-page-sub" style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--cinza-500)' }}>
            {t('meusCredenciamentos.subtitulo')}
          </p>
        </div>
      </div>

      {/* Chips de situação, com a contagem de cada recorte */}
      <div style={{ display: 'flex', gap: 9, margin: '18px 0 16px', flexWrap: 'wrap' }}>
        {chips.map((c) => {
          const ativo = filtro === c.chave;
          return (
            <button
              key={c.chave}
              type="button"
              data-cy={`filtro-${c.chave}`}
              aria-pressed={ativo}
              onClick={() => aoFiltrar(setFiltro)(c.chave)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999,
                border: `1px solid ${ativo ? 'var(--azul-700)' : 'var(--border)'}`,
                background: ativo ? 'var(--azul-50)' : '#fff',
                color: ativo ? 'var(--azul-700)' : 'var(--cinza-700)',
                font: '600 13px var(--font-body)', cursor: 'pointer',
              }}
            >
              {c.rotulo}
              <span style={{ fontSize: 11.5, opacity: 0.7 }}>{c.total}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconeBusca
            width={17}
            height={17}
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--cinza-400)' }}
          />
          <input
            className="input"
            aria-label={t('meusCredenciamentos.buscaAriaLabel')}
            value={busca}
            onChange={(e) => aoFiltrar(setBusca)(e.target.value)}
            placeholder={t('meusCredenciamentos.buscaPlaceholder')}
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>

        <button type="button" data-cy="exportar-csv" onClick={exportar} disabled={filtrados.length === 0} style={botaoExportar}>
          <IconeDownload width={16} height={16} style={{ color: 'var(--sucesso)' }} />
          {t('meusCredenciamentos.exportarCsv')}
        </button>
        <button type="button" data-cy="exportar-pdf" onClick={() => window.print()} disabled={filtrados.length === 0} style={botaoExportar}>
          <IconeDownload width={16} height={16} style={{ color: 'var(--erro)' }} />
          {t('meusCredenciamentos.exportarPdf')}
        </button>
      </div>

      {isLoading ? (
        <p data-cy="carregando">{t('meusCredenciamentos.carregando')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtrados.length === 0 ? (
            <div data-cy="estado-vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>
                {credenciamentos.length === 0 ? t('meusCredenciamentos.vazioTitulo') : t('meusCredenciamentos.vazioFiltroTitulo')}
              </div>
              <div style={{ fontSize: 13.5 }}>
                {credenciamentos.length === 0 ? t('meusCredenciamentos.vazioDica') : t('meusCredenciamentos.vazioFiltroDica')}
              </div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table data-cy="tabela-credenciamentos" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                  <thead>
                    <tr>
                      {colunas.map((c) => {
                        const ativa = c.chave === ordem;
                        return (
                          <th
                            key={c.chave ?? 'acoes'}
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
                    {visiveis.map((c) => {
                      const meta = ESTADOS[c.estado];
                      return (
                        <tr key={c.id} data-cy="credenciamento-item" data-estado={c.estado}>
                          <td style={{ ...celula, font: '600 14px var(--font-body)', color: 'var(--azul-700)', whiteSpace: 'nowrap' }}>
                            {numero(c)}
                          </td>
                          <td style={{ ...celula, fontSize: 14, color: 'var(--cinza-900)', minWidth: 220 }}>
                            {objeto(c)}
                            {subObjeto(c) && (
                              <div data-cy="sub-objeto" style={{ marginTop: 3, fontSize: 12.5, color: 'var(--cinza-500)' }}>
                                {subObjeto(c)}
                              </div>
                            )}
                          </td>
                          <td style={celula}>
                            <span data-cy="status" style={{ ...pill, background: meta.bg, color: meta.fg }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: meta.dot }} />
                              {rotuloEstado(c.estado)}
                            </span>
                          </td>
                          <td style={{ ...celula, fontSize: 13, color: 'var(--cinza-500)', whiteSpace: 'nowrap' }}>
                            {formatarData(c.criadoEm)}
                          </td>
                          <td style={{ ...celula, fontSize: 13, color: 'var(--cinza-500)', whiteSpace: 'nowrap' }}>
                            {formatarData(c.atualizadoEm)}
                          </td>
                          <td style={{ ...celula, textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                              {/* Cancelamento (A2) — só em "Em andamento", como no protótipo; o finalizado sai por "Visualizar". */}
                              {c.estado === 'iniciado' && (
                                <button
                                  type="button"
                                  data-cy="cancelar"
                                  title={t('meusCredenciamentos.acao.cancelar')}
                                  aria-label={t('meusCredenciamentos.acao.cancelar')}
                                  disabled={cancelar.isPending}
                                  onClick={() => cancelar.mutate(c.id)}
                                  style={botaoCancelar}
                                >
                                  <IconeFechar width={16} height={16} />
                                </button>
                              )}
                              <button
                                type="button"
                                data-cy={meta.acao}
                                className="btn btn-primary"
                                onClick={() => (meta.acao === 'visualizar' ? irParaDetalhe(c.id) : irParaWizard(c.editalId))}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
                              >
                                {t(`meusCredenciamentos.acao.${meta.acao}`)}
                                <IconeSeta width={15} height={15} />
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
                info={t('meusCredenciamentos.paginacaoInfo', {
                  de: (paginaAtual - 1) * POR_PAGINA + 1,
                  ate: Math.min(paginaAtual * POR_PAGINA, filtrados.length),
                  total: filtrados.length,
                })}
                pagina={paginaAtual}
                totalPaginas={totalPaginas}
                onPagina={setPagina}
                rotuloPagina={(n) => t('meusCredenciamentos.irParaPagina', { n })}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Container: resolve a empresa da sessão (mesmo padrão da Vitrine/Início). */
export function MeusCredenciamentosConectada() {
  const { t } = useTranslation();
  const fornecedorId = obterUsuario()?.empresaId;
  if (!fornecedorId) return <p data-cy="sem-empresa" style={{ color: 'var(--cinza-500)' }}>{t('meusCredenciamentos.semEmpresa')}</p>;
  return <MeusCredenciamentos fornecedorId={fornecedorId} />;
}
