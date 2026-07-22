import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoItemView } from '../../lib/api';
import { celula, cabecalho } from '../../design-system/tabela';
import { Botao } from '../../design-system/components';
import { IconeLapis, IconePower, IconeFechar, IconeInfo } from '../../design-system/icons';

/**
 * Painel Admin · "Tipos de Arquivos" (RF022 / UC020). Lista os tipos de documento exigidos no
 * credenciamento com documento (nome), formato aceito, categoria, validade e situação; ações de editar e
 * ativar/inativar (exclusão lógica RN015). Fiel ao protótipo `spec/Prototipo/painel-administrativo.html`
 * (cabeçalho "Documentos exigidos no credenciamento"). Reusa o CRUD genérico de catálogos (GET/POST/PATCH/
 * POST inativar|reativar `/catalogos/tipos-documento`); a lista inclui inativos.
 *
 * Arbitragem HTML×domínio: além de "Categoria" (cadastral/fiscal/contratual), a tela expõe "Obrigatório"
 * (2026-07-21, decisão do solicitante) — reintroduzida como atributo POR TIPO no catálogo (RF022
 * parametrizável, §02), revertendo a omissão anterior que a tratava por edital (RF007). Uso advisório: o
 * Passo 2 do UC004 destaca os obrigatórios pendentes, mas NÃO bloqueia (conclusão por Termo/RN016;
 * validação real na covalidação da CPL/UC006). A "Validade" é modelada em três modos mutuamente
 * exclusivos mapeados aos campos do domínio: sem validade, prazo fixo em dias (`validadeDias`, ex.:
 * "90 dias") ou por exercício (`exigeExercicio`, ex.: Balanço).
 */
const SLUG = 'tipos-documento' as const;

/** Categorias de retenção legal (RN015/UC017) — enum fechado no domínio. */
const CATEGORIAS = ['cadastral', 'fiscal', 'contratual'] as const;
type Categoria = (typeof CATEGORIAS)[number];

/** Modos de validade exibidos na tela (mapeados aos campos do domínio no salvar). */
type ModoValidade = 'sem' | 'dias' | 'exercicio';

/** Só dígitos, sem zeros à esquerda, no máximo 4 (até 9999 dias ≈ 27 anos). O prazo em dias nunca aceita
 *  letras nem símbolos (`e`, `.`, `+`, `-` escapam do `type=number` em alguns navegadores). */
export function soDigitosDias(v: string): string {
  return v.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 4);
}

const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
const iconeAcao: CSSProperties = { width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--cinza-600, #556)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

type Modal = { modo: 'criar' } | { modo: 'editar'; item: CatalogoItemView };

export function TiposArquivos() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState<Modal | null>(null);

  const { data: itens = [], isLoading, isError } = useQuery({
    queryKey: ['tipos-arquivos-admin'],
    queryFn: () => api.catalogoListar(SLUG, true),
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['tipos-arquivos-admin'] });

  const inativar = useMutation({ mutationFn: (id: string) => api.catalogoInativar(SLUG, id), onSuccess: () => void invalidar() });
  const reativar = useMutation({ mutationFn: (id: string) => api.catalogoReativar(SLUG, id), onSuccess: () => void invalidar() });
  const alternar = (i: CatalogoItemView) => (i.ativo ? inativar : reativar).mutate(i.id);

  /** Rótulo da coluna "Validade" a partir dos três modos (exercício > prazo em dias > exige > sem). */
  const rotuloValidade = (i: CatalogoItemView): string => {
    if (i.exigeExercicio) return t('admin.tiposArquivos.validade.exercicio');
    if (i.validadeDias != null) return t('admin.tiposArquivos.validade.dias', { dias: i.validadeDias });
    if (i.exigeValidade) return t('admin.tiposArquivos.validade.exige');
    return t('admin.tiposArquivos.validade.sem');
  };
  const rotuloCategoria = (c?: string): string =>
    CATEGORIAS.includes(c as Categoria) ? t(`admin.tiposArquivos.categorias.${c}`) : (c ?? '—');

  const colunas = [
    t('admin.tiposArquivos.campos.documento'),
    t('admin.tiposArquivos.campos.formato'),
    t('admin.tiposArquivos.campos.categoria'),
    t('admin.tiposArquivos.campos.obrigatorio'),
    t('admin.tiposArquivos.campos.validade'),
    t('admin.tiposArquivos.campos.status'),
    t('admin.tiposArquivos.campos.acoes'),
  ];

  return (
    <div className="stack" data-cy="admin-tipos-arquivos">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{t('admin.tiposArquivos.titulo')}</h1>
          <p className="page-sub">{t('admin.tiposArquivos.subtitulo')}</p>
        </div>
        <Botao data-cy="novo-cadastro" onClick={() => setModal({ modo: 'criar' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span>{t('admin.tiposArquivos.novoCadastro')}
        </Botao>
      </div>

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.tiposArquivos.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.tiposArquivos.erroCarregar')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {itens.length === 0 ? (
            <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.tiposArquivos.vazioTitulo')}</div>
              <div style={{ fontSize: 13.5 }}>{t('admin.tiposArquivos.vazioDica')}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table data-cy="tabela-tipos" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                <thead>
                  <tr>
                    {colunas.map((c, i) => (
                      <th key={c} scope="col" style={cabecalho(false, i === colunas.length - 1 ? 'right' : 'left')}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((s) => (
                    <tr key={s.id} data-cy="item-tipo" data-id={s.id} data-ativo={s.ativo}>
                      <td style={{ ...celula, font: '700 14px var(--font-body)', color: 'var(--azul-900)', minWidth: 220 }}>{s.nome}</td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-700)', whiteSpace: 'nowrap' }}>{(s.formato ?? '').toUpperCase()}</td>
                      <td style={{ ...celula, fontSize: 13.5, whiteSpace: 'nowrap' }}>
                        <span data-cy="categoria" style={{ color: 'var(--cinza-700)' }}>{rotuloCategoria(s.categoria)}</span>
                      </td>
                      <td style={{ ...celula, fontSize: 13.5, whiteSpace: 'nowrap' }}>
                        {s.obrigatorio ? (
                          <span data-cy="obrigatorio" style={{ ...pill, background: 'var(--azul-50)', color: 'var(--azul-700)' }}>{t('admin.tiposArquivos.obrigatorioSim')}</span>
                        ) : (
                          <span data-cy="obrigatorio" style={{ color: 'var(--cinza-400)' }}>{t('admin.tiposArquivos.obrigatorioNao')}</span>
                        )}
                      </td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-700)', whiteSpace: 'nowrap' }}>
                        <span data-cy="validade">{rotuloValidade(s)}</span>
                      </td>
                      <td style={celula}>
                        <span data-cy="status" style={{ ...pill, background: s.ativo ? 'var(--sucesso-bg)' : 'var(--cinza-100, #eef1f5)', color: s.ativo ? 'var(--sucesso)' : 'var(--cinza-500)' }}>
                          {t(`admin.tiposArquivos.status.${s.ativo ? 'ativo' : 'inativo'}`)}
                        </span>
                      </td>
                      <td style={{ ...celula, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button type="button" data-cy="editar" title={t('admin.tiposArquivos.acao.editar')} aria-label={t('admin.tiposArquivos.acao.editar')} onClick={() => setModal({ modo: 'editar', item: s })} style={iconeAcao}>
                            <IconeLapis width={20} height={20} />
                          </button>
                          <button type="button" data-cy="alternar-situacao" title={t(`admin.tiposArquivos.acao.${s.ativo ? 'inativar' : 'reativar'}`)} aria-label={t(`admin.tiposArquivos.acao.${s.ativo ? 'inativar' : 'reativar'}`)} disabled={inativar.isPending || reativar.isPending} onClick={() => alternar(s)} style={{ ...iconeAcao, color: s.ativo ? 'var(--cinza-600, #556)' : 'var(--sucesso)' }}>
                            <IconePower width={20} height={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && (
        <ModalTipo
          item={modal.modo === 'editar' ? modal.item : undefined}
          onFechar={() => setModal(null)}
          onMudou={() => void invalidar()}
        />
      )}
    </div>
  );
}

const overlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 };
const card: CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(680px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,.25)' };
const botaoX: CSSProperties = { width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--cinza-100, #eef1f5)', color: 'var(--cinza-500)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const rotulo: CSSProperties = { font: '600 13px var(--font-body)', color: 'var(--azul-900)', marginBottom: 6, display: 'block' };

/** Deriva o modo de validade inicial dos campos do domínio (exercício > dias > exige → dias > sem). */
function modoDe(item?: CatalogoItemView): ModoValidade {
  if (item?.exigeExercicio) return 'exercicio';
  if (item?.validadeDias != null || item?.exigeValidade) return 'dias';
  return 'sem';
}

/**
 * Modal único de tipo de arquivo — CRIAR (sem `item`) ou EDITAR (com `item`). Campos: Documento (nome,
 * chave natural), Formato aceito, Categoria (enum) e Validade (modo + prazo em dias quando aplicável).
 */
function ModalTipo({ item, onFechar, onMudou }: { item?: CatalogoItemView; onFechar: () => void; onMudou: () => void }) {
  const { t } = useTranslation();
  const editando = !!item;
  const [form, setForm] = useState({
    nome: item?.nome ?? '',
    formato: item?.formato ?? '',
    categoria: (item?.categoria as Categoria | '') ?? '',
    modo: modoDe(item),
    dias: item?.validadeDias != null ? String(item.validadeDias) : '',
    obrigatorio: item?.obrigatorio ?? false,
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const salvar = useMutation({
    mutationFn: async () => {
      const body = {
        nome: form.nome.trim(),
        formato: form.formato.trim(),
        categoria: form.categoria,
        exigeValidade: form.modo === 'dias',
        exigeExercicio: form.modo === 'exercicio',
        // Prazo fixo só no modo "dias"; nos demais, null limpa o campo no PATCH.
        validadeDias: form.modo === 'dias' ? Number(form.dias) : null,
        obrigatorio: form.obrigatorio,
      };
      if (editando) await api.catalogoEditar(SLUG, item!.id, body);
      else await api.catalogoCriar(SLUG, body);
    },
    onSuccess: () => { onMudou(); onFechar(); },
  });

  const setTexto = (campo: 'nome' | 'formato') => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [campo]: e.target.value });
  const titulo = editando ? t('admin.tiposArquivos.modal.tituloEditar') : t('admin.tiposArquivos.modal.tituloCriar');

  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={card} role="dialog" aria-modal="true" aria-label={titulo} data-cy="modal-tipo" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--azul-900)' }}>{titulo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('admin.tiposArquivos.modal.subtitulo')}</p>
          </div>
          <button type="button" onClick={onFechar} style={botaoX} data-cy="fechar-modal" aria-label={t('admin.tiposArquivos.fechar')}><IconeFechar width={20} height={20} /></button>
        </header>

        <form data-cy="form-tipo" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gap: 18 }}>
            <label>
              <span style={rotulo}>{t('admin.tiposArquivos.campos.documento')}</span>
              <input className="input" data-cy="campo-nome" required placeholder={t('admin.tiposArquivos.modal.nomePlaceholder')} value={form.nome} onChange={setTexto('nome')} style={{ width: '100%' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                <span style={rotulo}>{t('admin.tiposArquivos.modal.formatoLabel')}</span>
                <input className="input" data-cy="campo-formato" required placeholder={t('admin.tiposArquivos.modal.formatoPlaceholder')} value={form.formato} onChange={setTexto('formato')} style={{ width: '100%' }} />
              </label>
              <label>
                <span style={rotulo}>{t('admin.tiposArquivos.modal.categoriaLabel')}</span>
                <select className="input" data-cy="campo-categoria" required value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })} style={{ width: '100%' }}>
                  <option value="" disabled>{t('admin.tiposArquivos.modal.categoriaPlaceholder')}</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{t(`admin.tiposArquivos.categorias.${c}`)}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: form.modo === 'dias' ? '1fr 1fr' : '1fr', gap: 16 }}>
              <label>
                <span style={rotulo}>{t('admin.tiposArquivos.modal.validadeLabel')}</span>
                <select className="input" data-cy="campo-validade-modo" value={form.modo} onChange={(e) => setForm({ ...form, modo: e.target.value as ModoValidade })} style={{ width: '100%' }}>
                  <option value="sem">{t('admin.tiposArquivos.modal.validadeModo.sem')}</option>
                  <option value="dias">{t('admin.tiposArquivos.modal.validadeModo.dias')}</option>
                  <option value="exercicio">{t('admin.tiposArquivos.modal.validadeModo.exercicio')}</option>
                </select>
              </label>
              {form.modo === 'dias' && (
                <label>
                  <span style={rotulo}>{t('admin.tiposArquivos.modal.diasLabel')}</span>
                  <input className="input" data-cy="campo-validade-dias" type="text" required inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder={t('admin.tiposArquivos.modal.diasPlaceholder')} value={form.dias} onChange={(e) => setForm({ ...form, dias: soDigitosDias(e.target.value) })} style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }} />
                </label>
              )}
            </div>
            <label style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '14px 16px', border: `1.5px solid ${form.obrigatorio ? 'var(--azul-500)' : 'var(--border)'}`, borderRadius: 11, background: form.obrigatorio ? 'var(--azul-50)' : '#fff', cursor: 'pointer' }}>
              <input data-cy="campo-obrigatorio" type="checkbox" checked={form.obrigatorio} onChange={(e) => setForm({ ...form, obrigatorio: e.target.checked })} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: 'var(--azul-700)' }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', font: '600 14px var(--font-body)', color: 'var(--cinza-900)' }}>{t('admin.tiposArquivos.modal.obrigatorioLabel')}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 2 }}>{t('admin.tiposArquivos.modal.obrigatorioAjuda')}</span>
              </span>
            </label>
            <BannerHistorico />
            {salvar.isError && <p role="alert" data-cy="erro-salvar" style={{ margin: 0, fontSize: 13, color: 'var(--erro)' }}>{t('admin.tiposArquivos.modal.erroSalvar')}</p>}
          </div>
          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--divider)', background: 'var(--cinza-50, #f8fafc)', borderRadius: '0 0 16px 16px' }}>
            <Botao type="button" variante="secundario" data-cy="cancelar" onClick={onFechar}>{t('admin.tiposArquivos.modal.cancelar')}</Botao>
            <Botao type="submit" data-cy="salvar-tipo" disabled={salvar.isPending}>{t('admin.tiposArquivos.modal.salvar')}</Botao>
          </footer>
        </form>
      </div>
    </div>
  );
}

/** Aviso do protótipo: exclusão é lógica (RN015) — nunca apaga, converte para Inativo, preservando vínculos. */
function BannerHistorico(): ReactNode {
  const { t } = useTranslation();
  return (
    <div data-cy="banner-historico" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, background: 'var(--azul-50)', color: 'var(--azul-900)', fontSize: 13 }}>
      <IconeInfo width={18} height={18} style={{ flexShrink: 0, marginTop: 1, color: 'var(--azul-700)' }} />
      <span>{t('admin.tiposArquivos.modal.avisoHistorico')}</span>
    </div>
  );
}
