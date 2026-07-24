import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { api, type CatalogoSlug, type CatalogoItemView } from '../../lib/api';
import { Card, Botao, BotaoIcone } from '../../design-system/components';
import { celula, cabecalho } from '../../design-system/tabela';
import { IconePower } from '../../design-system/icons';
import { exportarCsv } from '../../lib/exportar';

/**
 * UC020 — Manter Catálogos (Painel Admin). Uma jornada, quatro catálogos: Secretarias (RF020),
 * Setores/CNAE (RF021), Tipos de Documento (RF022) e **Materiais e Serviços** — os itens que a
 * Administração compra/contrata, modelados a partir do projeto de referência `comprac_api`.
 *
 * CRUD com inativação lógica (RN015): o item inativo some da lista padrão (toggle "mostrar inativos")
 * mas pode ser reativado. As escritas dos três catálogos base exigem papel Administrador; as de
 * materiais e serviços aceitam também a Secretaria (`smga`) — que é o perfil dono desta tela por padrão.
 * O botão fica visível de qualquer forma; quem não tem o papel recebe 403 da API.
 *
 * Capacidades por catálogo são declarativas: um catálogo que define `busca` ganha campo de pesquisa,
 * `filtro` ganha o seletor correspondente e `exportacao` ganha os botões CSV/PDF. Hoje só materiais e
 * serviços as declara — é o catálogo que cresce para centenas/milhares de linhas.
 */
type TipoCampo = 'text' | 'select' | 'checkbox' | 'textarea' | 'lista' | 'unidades';
/**
 * `largura: 'total'` faz o campo ocupar a linha inteira da grade de duas colunas — reservado a campos
 * de texto longo (nome, especificações). Sem isso o formulário volta a ser uma coluna estreita com
 * metade do cartão vazia. A ordem dos campos é a ordem visual: cada par consecutivo de campos "meia
 * largura" divide uma linha.
 */
interface CampoDef { nome: string; labelKey: string; tipo: TipoCampo; opcoes?: { valor: string; labelKey: string }[]; dicaKey?: string; largura?: 'total' }
interface FiltroDef { nome: string; labelKey: string; todosKey: string; opcoes: { valor: string; labelKey: string }[]; valorDoItem: (i: CatalogoItemView) => string }
interface ExportacaoDef { nomeArquivo: string; colunasKey: string[]; linha: (i: CatalogoItemView, rotular: (chave: string) => string) => string[] }
/** Uma coluna da tabela de itens (a de Situação e a de Ações são fixas, acrescentadas no render). */
interface ColunaDef { rotuloKey: string; dataCy?: string; render: (i: CatalogoItemView, t: TFunction) => ReactNode; estilo?: CSSProperties }
interface CatalogoDef {
  slug: CatalogoSlug;
  tabKey: string;
  campos: CampoDef[];
  /** Colunas próprias do catálogo na tabela de itens (RN015: a listagem espelha as telas irmãs). */
  colunas: ColunaDef[];
  /** Texto pesquisável do item; declarar habilita o campo de busca. */
  busca?: (i: CatalogoItemView) => string;
  filtro?: FiltroDef;
  exportacao?: ExportacaoDef;
}

/** Célula de identificador (sigla/código/número): monoespaçada tabular, em navy — como nas telas irmãs. */
const celulaChave: CSSProperties = { ...celula, font: '700 14px var(--font-body)', color: 'var(--azul-900)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' };
const celulaTexto: CSSProperties = { ...celula, fontSize: 13.5, color: 'var(--cinza-800)' };
const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };

/** Opções de natureza do item — espelham o domínio `TipoItem` ('material' | 'servico'). */
const TIPOS_ITEM = [
  { valor: 'material', labelKey: 'admin.catalogos.tiposItem.material' },
  { valor: 'servico', labelKey: 'admin.catalogos.tiposItem.servico' },
];

// Nota: as Secretarias NÃO figuram aqui — são mantidas na tela dedicada `/admin/secretarias`
// (`Secretarias.tsx`); a aba foi retirada desta jornada para não duplicar o mesmo cadastro.
const CATALOGOS: CatalogoDef[] = [
  {
    slug: 'setores-cnae', tabKey: 'admin.catalogos.tabs.setores',
    campos: [
      { nome: 'codigo', labelKey: 'admin.catalogos.campos.codigo', tipo: 'text' },
      { nome: 'descricao', labelKey: 'admin.catalogos.campos.descricao', tipo: 'text' },
    ],
    colunas: [
      { rotuloKey: 'admin.catalogos.campos.codigo', estilo: celulaChave, render: (i) => i.codigo },
      { rotuloKey: 'admin.catalogos.campos.descricao', render: (i) => i.descricao },
    ],
  },
  {
    slug: 'tipos-documento', tabKey: 'admin.catalogos.tabs.tiposDoc',
    campos: [
      { nome: 'nome', labelKey: 'admin.catalogos.campos.nomeTipo', tipo: 'text', largura: 'total' },
      { nome: 'formato', labelKey: 'admin.catalogos.campos.formato', tipo: 'text' },
      {
        nome: 'categoria', labelKey: 'admin.catalogos.campos.categoria', tipo: 'select',
        opcoes: [
          { valor: 'cadastral', labelKey: 'admin.catalogos.categorias.cadastral' },
          { valor: 'fiscal', labelKey: 'admin.catalogos.categorias.fiscal' },
          { valor: 'contratual', labelKey: 'admin.catalogos.categorias.contratual' },
        ],
      },
      { nome: 'exigeValidade', labelKey: 'admin.catalogos.campos.exigeValidade', tipo: 'checkbox' },
      { nome: 'exigeExercicio', labelKey: 'admin.catalogos.campos.exigeExercicio', tipo: 'checkbox' },
    ],
    colunas: [
      { rotuloKey: 'admin.catalogos.campos.nomeTipo', estilo: { ...celulaTexto, fontWeight: 600, color: 'var(--azul-900)' }, render: (i) => i.nome },
      { rotuloKey: 'admin.catalogos.campos.formato', render: (i) => i.formato },
      { rotuloKey: 'admin.catalogos.campos.categoria', render: (i) => i.categoria },
    ],
  },
  {
    slug: 'unidades-medida', tabKey: 'admin.catalogos.tabs.unidadesMedida',
    campos: [
      { nome: 'simbolo', labelKey: 'admin.catalogos.campos.simbolo', tipo: 'text', dicaKey: 'admin.catalogos.campos.simboloDica' },
      { nome: 'descricao', labelKey: 'admin.catalogos.campos.descricaoUnidade', tipo: 'text', largura: 'total' },
    ],
    colunas: [
      { rotuloKey: 'admin.catalogos.campos.simbolo', estilo: celulaChave, render: (i) => i.simbolo },
      { rotuloKey: 'admin.catalogos.campos.descricaoUnidade', render: (i) => i.descricao },
    ],
  },
  {
    slug: 'materiais-servicos', tabKey: 'admin.catalogos.tabs.materiais',
    busca: (i) => `${i.numero ?? ''} ${i.nome ?? ''} ${i.especificacoes ?? ''}`,
    campos: [
      { nome: 'nome', labelKey: 'admin.catalogos.campos.nomeItem', tipo: 'text', largura: 'total' },
      { nome: 'tipo', labelKey: 'admin.catalogos.campos.tipoItem', tipo: 'select', opcoes: TIPOS_ITEM },
      { nome: 'unidades', labelKey: 'admin.catalogos.campos.unidades', tipo: 'unidades', dicaKey: 'admin.catalogos.campos.unidadesDica', largura: 'total' },
      { nome: 'especificacoes', labelKey: 'admin.catalogos.campos.especificacoes', tipo: 'textarea', largura: 'total' },
    ],
    // O número (ITM-AAAA/NNN) é gerado pelo backend — aparece na tabela, nunca no formulário.
    colunas: [
      { rotuloKey: 'admin.catalogos.campos.numero', estilo: celulaChave, render: (i) => i.numero },
      { rotuloKey: 'admin.catalogos.campos.nomeItem', estilo: { ...celulaTexto, fontWeight: 600, color: 'var(--azul-900)' }, render: (i) => i.nome },
      { rotuloKey: 'admin.catalogos.campos.tipoItem', dataCy: 'tipo-item', render: (i, t) => (i.tipo ? t(`admin.catalogos.tiposItem.${i.tipo}`) : '') },
      { rotuloKey: 'admin.catalogos.campos.unidades', dataCy: 'unidades-item', render: (i) => (i.unidades ?? []).join(', ') },
    ],
    filtro: {
      nome: 'tipo', labelKey: 'admin.catalogos.filtros.tipo', todosKey: 'admin.catalogos.filtros.tipoTodos',
      opcoes: TIPOS_ITEM, valorDoItem: (i) => i.tipo ?? '',
    },
    exportacao: {
      nomeArquivo: 'catalogo-materiais-servicos.csv',
      colunasKey: [
        'admin.catalogos.campos.numero', 'admin.catalogos.campos.nomeItem', 'admin.catalogos.campos.tipoItem',
        'admin.catalogos.campos.unidades', 'admin.catalogos.campos.especificacoes', 'admin.catalogos.campos.situacao',
      ],
      linha: (i, rotular) => [
        i.numero ?? '', i.nome ?? '', rotular(`admin.catalogos.tiposItem.${i.tipo ?? 'material'}`),
        (i.unidades ?? []).join(', '), i.especificacoes ?? '',
        rotular(i.ativo ? 'admin.catalogos.situacaoAtivo' : 'admin.catalogos.situacaoInativo'),
      ],
    },
  },
];

function inicial(def: CatalogoDef): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const c of def.campos) {
    v[c.nome] = c.tipo === 'checkbox' ? false
      : c.tipo === 'unidades' ? []
      : c.tipo === 'select' ? (c.opcoes?.[0]?.valor ?? '')
      : '';
  }
  return v;
}

/** Campo `lista` chega como texto separado por vírgula e vai ao backend como array (ex.: unidades). */
function paraEnvio(def: CatalogoDef, valores: Record<string, unknown>): Record<string, unknown> {
  const corpo: Record<string, unknown> = { ...valores };
  for (const c of def.campos) {
    if (c.tipo !== 'lista') continue;
    corpo[c.nome] = String(valores[c.nome] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  }
  return corpo;
}

export function ManterCatalogos() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [slug, setSlug] = useState<CatalogoSlug>(CATALOGOS[0].slug);
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [termo, setTermo] = useState('');
  const [filtro, setFiltro] = useState('');
  const def = CATALOGOS.find((c) => c.slug === slug) ?? CATALOGOS[0];
  const [valores, setValores] = useState<Record<string, unknown>>(() => inicial(CATALOGOS[0]));

  const { data: itens = [] } = useQuery({
    queryKey: ['catalogos', slug, incluirInativos],
    queryFn: () => api.catalogoListar(slug, incluirInativos),
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['catalogos', slug] });

  // Campo de unidades (materiais/serviços) é alimentado pelo catálogo de Unidades de medida — só as
  // unidades ATIVAS. Busca apenas quando o catálogo ativo tem um campo desse tipo (evita chamada nas
  // demais abas). Compartilha a chave de cache com a listagem da própria aba "Unidades de medida".
  const precisaUnidades = def.campos.some((c) => c.tipo === 'unidades');
  const { data: unidadesDisponiveis = [] } = useQuery({
    queryKey: ['catalogos', 'unidades-medida', false],
    queryFn: () => api.catalogoListar('unidades-medida'),
    enabled: precisaUnidades,
  });
  const alternarUnidade = (nome: string, simbolo: string) => setValores((v) => {
    const atual = Array.isArray(v[nome]) ? (v[nome] as string[]) : [];
    return { ...v, [nome]: atual.includes(simbolo) ? atual.filter((s) => s !== simbolo) : [...atual, simbolo] };
  });

  const criar = useMutation({
    mutationFn: (v: Record<string, unknown>) => api.catalogoCriar(slug, paraEnvio(def, v)),
    onSuccess: () => { setValores(inicial(def)); void invalidar(); },
  });
  const inativar = useMutation({ mutationFn: (id: string) => api.catalogoInativar(slug, id), onSuccess: () => void invalidar() });
  const reativar = useMutation({ mutationFn: (id: string) => api.catalogoReativar(slug, id), onSuccess: () => void invalidar() });

  // Busca e filtro são client-side: a listagem já vem inteira do backend (é dado de referência, sem
  // paginação de servidor). Se o catálogo crescer a milhares de itens, migrar para QBE no backend —
  // mesmo caminho que "Gestão de Fornecedores" já segue.
  const visiveis = useMemo(() => {
    const alvo = termo.trim().toLowerCase();
    return itens.filter((i) => {
      if (def.filtro && filtro && def.filtro.valorDoItem(i) !== filtro) return false;
      if (!alvo || !def.busca) return true;
      return def.busca(i).toLowerCase().includes(alvo);
    });
  }, [itens, termo, filtro, def]);

  function trocarCatalogo(novo: CatalogoSlug) {
    const d = CATALOGOS.find((c) => c.slug === novo) ?? CATALOGOS[0];
    setSlug(novo);
    setValores(inicial(d));
    setTermo('');
    setFiltro('');
    criar.reset();
  }

  const exportar = () => {
    if (!def.exportacao) return;
    exportarCsv(
      def.exportacao.colunasKey.map((k) => t(k)),
      visiveis.map((i) => def.exportacao!.linha(i, t)),
      def.exportacao.nomeArquivo,
    );
  };

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{t('admin.catalogos.titulo')}</h1>
        <p className="page-sub">{t('admin.catalogos.subtitulo')}</p>
      </div>

      {/* `role="tablist"` exige filhos `role="tab"`, e `aria-selected` só é permitido nesse papel — sem
          isso o axe acusa aria-required-children + aria-allowed-attr (WCAG 2.1 AA / e-MAG). */}
      <div role="tablist" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATALOGOS.map((c) => (
          <Botao key={c.slug} data-cy={`tab-${c.slug}`} variante={c.slug === slug ? 'primario' : 'secundario'}
            role="tab" aria-selected={c.slug === slug} onClick={() => trocarCatalogo(c.slug)}>
            {t(c.tabKey)}
          </Botao>
        ))}
      </div>

      <Card>
        <form data-cy="form-catalogo" className="cm-form-grid" style={{ maxWidth: 880 }}
          onSubmit={(e) => { e.preventDefault(); criar.mutate(valores); }}>
          {def.campos.map((campo) => (
            campo.tipo === 'checkbox' ? (
              // Booleano é caixa + rótulo na MESMA linha: empilhá-los (como nos demais campos) deixava a
              // caixinha órfã sob o texto, sem alvo de clique claro.
              <label key={campo.nome} className={`label${campo.largura === 'total' ? ' cm-campo-total' : ''}`}
                style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 38, cursor: 'pointer' }}>
                <input data-cy={`campo-${campo.nome}`} type="checkbox" checked={Boolean(valores[campo.nome])}
                  style={{ width: 17, height: 17, flexShrink: 0, accentColor: 'var(--azul-700)' }}
                  onChange={(e) => setValores({ ...valores, [campo.nome]: e.target.checked })} />
                <span style={{ minWidth: 0 }}>{t(campo.labelKey)}</span>
              </label>
            ) : campo.tipo === 'unidades' ? (
              // Seleção múltipla alimentada pelo catálogo de Unidades de medida (só as ativas). Cada
              // unidade é um chip-checkbox; o valor guardado é a lista de símbolos selecionados.
              <div key={campo.nome} className={`label${campo.largura === 'total' ? ' cm-campo-total' : ''}`} style={{ display: 'grid', gap: 6, alignContent: 'start' }}>
                <span>{t(campo.labelKey)}</span>
                {unidadesDisponiveis.length === 0 ? (
                  <small data-cy="unidades-vazio" style={{ color: 'var(--cinza-500)' }}>{t('admin.catalogos.campos.unidadesVazio')}</small>
                ) : (
                  <div data-cy={`campo-${campo.nome}`} role="group" aria-label={t(campo.labelKey)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {unidadesDisponiveis.map((u) => {
                      const sel = Array.isArray(valores[campo.nome]) && (valores[campo.nome] as string[]).includes(u.simbolo ?? '');
                      return (
                        <label key={u.id} data-cy={`unidade-opcao-${u.simbolo}`} data-selected={sel} title={u.descricao}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                            border: `1px solid ${sel ? 'var(--azul-700)' : 'var(--border)'}`, background: sel ? 'var(--azul-50)' : '#fff',
                            color: sel ? 'var(--azul-800)' : 'var(--cinza-700)', font: '600 13px var(--font-body)', userSelect: 'none' }}>
                          <input type="checkbox" checked={sel} onChange={() => alternarUnidade(campo.nome, u.simbolo ?? '')}
                            style={{ width: 15, height: 15, flexShrink: 0, accentColor: 'var(--azul-700)' }} />
                          {u.simbolo}
                        </label>
                      );
                    })}
                  </div>
                )}
                {campo.dicaKey && <small style={{ color: 'var(--cinza-500)' }}>{t(campo.dicaKey)}</small>}
              </div>
            ) : (
              <label key={campo.nome} className={`label${campo.largura === 'total' ? ' cm-campo-total' : ''}`}
                style={{ display: 'grid', gap: 4, alignContent: 'start' }}>
                {t(campo.labelKey)}
                {campo.tipo === 'select' ? (
                  <select data-cy={`campo-${campo.nome}`} className="input" value={String(valores[campo.nome] ?? '')}
                    onChange={(e) => setValores({ ...valores, [campo.nome]: e.target.value })}>
                    {campo.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{t(o.labelKey)}</option>)}
                  </select>
                ) : campo.tipo === 'textarea' ? (
                  <textarea data-cy={`campo-${campo.nome}`} className="input" rows={3} value={String(valores[campo.nome] ?? '')}
                    onChange={(e) => setValores({ ...valores, [campo.nome]: e.target.value })} />
                ) : (
                  <input data-cy={`campo-${campo.nome}`} className="input" value={String(valores[campo.nome] ?? '')}
                    onChange={(e) => setValores({ ...valores, [campo.nome]: e.target.value })} />
                )}
                {campo.dicaKey && <small style={{ color: 'var(--cinza-500)' }}>{t(campo.dicaKey)}</small>}
              </label>
            )
          ))}
          {/* Rodapé: o botão não se estica pela linha — largura própria, à esquerda, como nos demais formulários. */}
          <div className="cm-campo-total" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <Botao data-cy="criar" type="submit" disabled={criar.isPending}>{t('admin.catalogos.criar')}</Botao>
            {criar.isError && <p data-cy="erro" role="alert" style={{ margin: 0, color: 'var(--erro, #c0392b)' }}>{t('admin.catalogos.erroCriar')}</p>}
          </div>
        </form>
      </Card>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {def.busca && (
          <input data-cy="busca" className="input" style={{ maxWidth: 280 }} value={termo}
            aria-label={t('admin.catalogos.buscaAriaLabel')} placeholder={t('admin.catalogos.buscaPlaceholder')}
            onChange={(e) => setTermo(e.target.value)} />
        )}
        {def.filtro && (
          <label className="label" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {t(def.filtro.labelKey)}
            <select data-cy="filtro-tipo" className="input" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="">{t(def.filtro.todosKey)}</option>
              {def.filtro.opcoes.map((o) => <option key={o.valor} value={o.valor}>{t(o.labelKey)}</option>)}
            </select>
          </label>
        )}
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input data-cy="mostrar-inativos" type="checkbox" checked={incluirInativos} onChange={(e) => setIncluirInativos(e.target.checked)} />
          {t('admin.catalogos.mostrarInativos')}
        </label>
        {def.exportacao && (
          <>
            <Botao data-cy="exportar-csv" variante="secundario" onClick={exportar} disabled={visiveis.length === 0}>
              {t('admin.catalogos.exportarCsv')}
            </Botao>
            <Botao data-cy="exportar-pdf" variante="secundario" onClick={() => window.print()} disabled={visiveis.length === 0}>
              {t('admin.catalogos.exportarPdf')}
            </Botao>
          </>
        )}
      </div>

      {/* Lista em tabela, alinhada às telas irmãs (Secretarias/Setores/Tipos): card sem padding, cabeçalho
          via `cabecalho()`, células via `celula`, pill de situação e ações em `BotaoIcone`. */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {visiveis.length === 0 ? (
          <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
            {t('admin.catalogos.vazio')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table data-cy="tabela-catalogo" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
              <thead>
                <tr>
                  {def.colunas.map((c) => <th key={c.rotuloKey} scope="col" style={cabecalho(false)}>{t(c.rotuloKey)}</th>)}
                  <th scope="col" style={cabecalho(false)}>{t('admin.catalogos.campos.situacao')}</th>
                  <th scope="col" style={cabecalho(false, 'right')}>{t('admin.catalogos.campos.acoes')}</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i) => (
                  <tr key={i.id} data-cy="item-catalogo" data-id={i.id} data-ativo={i.ativo}>
                    {def.colunas.map((c) => (
                      <td key={c.rotuloKey} data-cy={c.dataCy} style={c.estilo ?? celulaTexto}>{c.render(i, t)}</td>
                    ))}
                    <td style={celula}>
                      <span data-cy="situacao" style={{ ...pill, background: i.ativo ? 'var(--sucesso-bg)' : 'var(--cinza-100, #eef1f5)', color: i.ativo ? 'var(--sucesso)' : 'var(--cinza-500)' }}>
                        {t(i.ativo ? 'admin.catalogos.situacaoAtivo' : 'admin.catalogos.situacaoInativo')}
                      </span>
                    </td>
                    <td style={{ ...celula, textAlign: 'right' }}>
                      {/* Um único botão de alternância (o mesmo alvo do protótipo); o `data-cy` reflete a
                          ação disponível — `inativar` quando ativo, `reativar` quando inativo. */}
                      <BotaoIcone
                        icone={IconePower}
                        data-cy={i.ativo ? 'inativar' : 'reativar'}
                        title={t(i.ativo ? 'admin.catalogos.inativar' : 'admin.catalogos.reativar')}
                        aria-label={t(i.ativo ? 'admin.catalogos.inativar' : 'admin.catalogos.reativar')}
                        disabled={inativar.isPending || reativar.isPending}
                        onClick={() => (i.ativo ? inativar : reativar).mutate(i.id)}
                        style={{ color: i.ativo ? 'var(--cinza-600, #556)' : 'var(--sucesso)' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
