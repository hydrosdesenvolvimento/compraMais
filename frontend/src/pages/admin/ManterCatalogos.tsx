import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoSlug, type CatalogoItemView } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';

/**
 * UC020 — Manter Catálogos Base (Painel Admin). Uma jornada, três catálogos: Secretarias (RF020),
 * Setores/CNAE (RF021) e Tipos de Documento (RF022). CRUD com inativação lógica (RN015): o item inativo
 * some da lista padrão (toggle "mostrar inativos") mas pode ser reativado. Escritas exigem RBAC
 * Administrador no backend (o botão fica visível, mas a API responde 403 sem o papel).
 */
type TipoCampo = 'text' | 'select' | 'checkbox';
interface CampoDef { nome: string; labelKey: string; tipo: TipoCampo; opcoes?: { valor: string; labelKey: string }[] }
interface CatalogoDef { slug: CatalogoSlug; tabKey: string; campos: CampoDef[]; resumo: (i: CatalogoItemView) => string }

const CATALOGOS: CatalogoDef[] = [
  {
    slug: 'secretarias', tabKey: 'admin.catalogos.tabs.secretarias',
    resumo: (i) => `${i.sigla ?? ''} — ${i.nome ?? ''}`,
    campos: [
      { nome: 'sigla', labelKey: 'admin.catalogos.campos.sigla', tipo: 'text' },
      { nome: 'nome', labelKey: 'admin.catalogos.campos.nome', tipo: 'text' },
      { nome: 'responsavel', labelKey: 'admin.catalogos.campos.responsavel', tipo: 'text' },
    ],
  },
  {
    slug: 'setores-cnae', tabKey: 'admin.catalogos.tabs.setores',
    resumo: (i) => `${i.codigo ?? ''} — ${i.descricao ?? ''}`,
    campos: [
      { nome: 'codigo', labelKey: 'admin.catalogos.campos.codigo', tipo: 'text' },
      { nome: 'descricao', labelKey: 'admin.catalogos.campos.descricao', tipo: 'text' },
    ],
  },
  {
    slug: 'tipos-documento', tabKey: 'admin.catalogos.tabs.tiposDoc',
    resumo: (i) => `${i.nome ?? ''} (${i.categoria ?? ''})`,
    campos: [
      { nome: 'nome', labelKey: 'admin.catalogos.campos.nomeTipo', tipo: 'text' },
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
  },
];

function inicial(def: CatalogoDef): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const c of def.campos) v[c.nome] = c.tipo === 'checkbox' ? false : c.tipo === 'select' ? (c.opcoes?.[0]?.valor ?? '') : '';
  return v;
}

export function ManterCatalogos() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [slug, setSlug] = useState<CatalogoSlug>('secretarias');
  const [incluirInativos, setIncluirInativos] = useState(false);
  const def = CATALOGOS.find((c) => c.slug === slug) ?? CATALOGOS[0];
  const [valores, setValores] = useState<Record<string, unknown>>(() => inicial(CATALOGOS[0]));

  const { data: itens = [] } = useQuery({
    queryKey: ['catalogos', slug, incluirInativos],
    queryFn: () => api.catalogoListar(slug, incluirInativos),
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['catalogos', slug] });

  const criar = useMutation({
    mutationFn: (v: Record<string, unknown>) => api.catalogoCriar(slug, v),
    onSuccess: () => { setValores(inicial(def)); void invalidar(); },
  });
  const inativar = useMutation({ mutationFn: (id: string) => api.catalogoInativar(slug, id), onSuccess: () => void invalidar() });
  const reativar = useMutation({ mutationFn: (id: string) => api.catalogoReativar(slug, id), onSuccess: () => void invalidar() });

  function trocarCatalogo(novo: CatalogoSlug) {
    const d = CATALOGOS.find((c) => c.slug === novo) ?? CATALOGOS[0];
    setSlug(novo);
    setValores(inicial(d));
    criar.reset();
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{t('admin.catalogos.titulo')}</h1>
        <p className="page-sub">{t('admin.catalogos.subtitulo')}</p>
      </div>

      <div role="tablist" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATALOGOS.map((c) => (
          <Botao key={c.slug} data-cy={`tab-${c.slug}`} variante={c.slug === slug ? 'primario' : 'secundario'}
            aria-selected={c.slug === slug} onClick={() => trocarCatalogo(c.slug)}>
            {t(c.tabKey)}
          </Botao>
        ))}
      </div>

      <Card>
        <form data-cy="form-catalogo" onSubmit={(e) => { e.preventDefault(); criar.mutate(valores); }} style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
          {def.campos.map((campo) => (
            <label key={campo.nome} className="label" style={{ display: 'grid', gap: 4 }}>
              {t(campo.labelKey)}
              {campo.tipo === 'checkbox' ? (
                <input data-cy={`campo-${campo.nome}`} type="checkbox" checked={Boolean(valores[campo.nome])}
                  onChange={(e) => setValores({ ...valores, [campo.nome]: e.target.checked })} />
              ) : campo.tipo === 'select' ? (
                <select data-cy={`campo-${campo.nome}`} className="input" value={String(valores[campo.nome] ?? '')}
                  onChange={(e) => setValores({ ...valores, [campo.nome]: e.target.value })}>
                  {campo.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{t(o.labelKey)}</option>)}
                </select>
              ) : (
                <input data-cy={`campo-${campo.nome}`} className="input" value={String(valores[campo.nome] ?? '')}
                  onChange={(e) => setValores({ ...valores, [campo.nome]: e.target.value })} />
              )}
            </label>
          ))}
          <Botao data-cy="criar" type="submit" disabled={criar.isPending}>{t('admin.catalogos.criar')}</Botao>
          {criar.isError && <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.catalogos.erroCriar')}</p>}
        </form>
      </Card>

      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input data-cy="mostrar-inativos" type="checkbox" checked={incluirInativos} onChange={(e) => setIncluirInativos(e.target.checked)} />
        {t('admin.catalogos.mostrarInativos')}
      </label>

      {itens.length === 0 ? (
        <p data-cy="vazio" className="page-sub">{t('admin.catalogos.vazio')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {itens.map((i) => (
            <li key={i.id} data-cy="item-catalogo" data-ativo={i.ativo} className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ flex: 1 }}>
                {def.resumo(i)}
                {!i.ativo && <em style={{ color: 'var(--texto-suave)' }}> — {t('admin.catalogos.situacaoInativo')}</em>}
              </span>
              {i.ativo
                ? <Botao data-cy="inativar" variante="secundario" onClick={() => inativar.mutate(i.id)}>{t('admin.catalogos.inativar')}</Botao>
                : <Botao data-cy="reativar" onClick={() => reativar.mutate(i.id)}>{t('admin.catalogos.reativar')}</Botao>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
