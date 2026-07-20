import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoItemView } from '../../lib/api';
import { celula, cabecalho } from '../../design-system/tabela';
import { Botao } from '../../design-system/components';
import { IconeLapis, IconePower, IconeFechar, IconeInfo } from '../../design-system/icons';

/**
 * Painel Admin · "Setores Industriais (CNAE)" (RF021). Lista os códigos de atividade econômica aceitos com
 * código, descrição, categoria e situação; ações de editar e ativar/inativar (exclusão lógica RN015). Fiel
 * ao protótipo `spec/Prototipo/painel-administrativo.html` (colunas Código · Descrição · Categoria · Situação
 * · Ações). Reusa o CRUD genérico de catálogos (GET/POST/PATCH/POST inativar|reativar `/catalogos/setores-cnae`).
 * Lista inclui inativos (o protótipo mostra ativos e inativos juntos). O código é armazenado como subclasse de
 * 7 dígitos no backend (`exigirCnae`); aqui a máscara `####-#/##` é só de apresentação/entrada.
 */
const SLUG = 'setores-cnae' as const;

const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
const iconeAcao: CSSProperties = { width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--cinza-600, #556)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

/** Só os dígitos, no máximo 7 (subclasse CNAE). */
export function soDigitosCnae(v: string): string { return v.replace(/\D/g, '').slice(0, 7); }

/** Formata uma subclasse CNAE (até 7 dígitos) na máscara de apresentação `####-#/##`. */
export function formatarCnae(v: string): string {
  const s = soDigitosCnae(v);
  if (!s) return '';
  let out = s.slice(0, 4);
  if (s.length > 4) out += `-${s.slice(4, 5)}`;
  if (s.length > 5) out += `/${s.slice(5, 7)}`;
  return out;
}

type Modal = { modo: 'criar' } | { modo: 'editar'; item: CatalogoItemView };

export function SetoresIndustriais() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState<Modal | null>(null);

  const { data: itens = [], isLoading, isError } = useQuery({
    queryKey: ['setores-admin'],
    queryFn: () => api.catalogoListar(SLUG, true),
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['setores-admin'] });

  const inativar = useMutation({ mutationFn: (id: string) => api.catalogoInativar(SLUG, id), onSuccess: () => void invalidar() });
  const reativar = useMutation({ mutationFn: (id: string) => api.catalogoReativar(SLUG, id), onSuccess: () => void invalidar() });
  const alternar = (i: CatalogoItemView) => (i.ativo ? inativar : reativar).mutate(i.id);

  const colunas = [
    t('admin.setoresIndustriais.campos.codigo'),
    t('admin.setoresIndustriais.campos.descricao'),
    t('admin.setoresIndustriais.campos.categoria'),
    t('admin.setoresIndustriais.campos.status'),
    t('admin.setoresIndustriais.campos.acoes'),
  ];

  return (
    <div className="stack" data-cy="admin-setores">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{t('admin.setoresIndustriais.titulo')}</h1>
          <p className="page-sub">{t('admin.setoresIndustriais.subtitulo')}</p>
        </div>
        <Botao data-cy="novo-cadastro" onClick={() => setModal({ modo: 'criar' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span>{t('admin.setoresIndustriais.novoCadastro')}
        </Botao>
      </div>

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.setoresIndustriais.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.setoresIndustriais.erroCarregar')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {itens.length === 0 ? (
            <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.setoresIndustriais.vazioTitulo')}</div>
              <div style={{ fontSize: 13.5 }}>{t('admin.setoresIndustriais.vazioDica')}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table data-cy="tabela-setores" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                <thead>
                  <tr>
                    {colunas.map((c, i) => (
                      <th key={c} scope="col" style={cabecalho(false, i === colunas.length - 1 ? 'right' : 'left')}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((s) => (
                    <tr key={s.id} data-cy="item-setor" data-id={s.id} data-ativo={s.ativo}>
                      <td style={{ ...celula, font: '700 14px var(--font-body)', color: 'var(--azul-900)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatarCnae(s.codigo ?? '')}</td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-800)', minWidth: 240 }}>{s.descricao}</td>
                      <td style={{ ...celula, fontSize: 13.5, whiteSpace: 'nowrap' }}>
                        {s.categoria
                          ? <span data-cy="categoria" style={{ color: 'var(--cinza-700)' }}>{s.categoria}</span>
                          : <span data-cy="sem-categoria" style={{ color: 'var(--cinza-400)' }}>{t('admin.setoresIndustriais.semCategoria')}</span>}
                      </td>
                      <td style={celula}>
                        <span data-cy="status" style={{ ...pill, background: s.ativo ? 'var(--sucesso-bg)' : 'var(--cinza-100, #eef1f5)', color: s.ativo ? 'var(--sucesso)' : 'var(--cinza-500)' }}>
                          {t(`admin.setoresIndustriais.status.${s.ativo ? 'ativo' : 'inativo'}`)}
                        </span>
                      </td>
                      <td style={{ ...celula, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button type="button" data-cy="editar" title={t('admin.setoresIndustriais.acao.editar')} aria-label={t('admin.setoresIndustriais.acao.editar')} onClick={() => setModal({ modo: 'editar', item: s })} style={iconeAcao}>
                            <IconeLapis width={20} height={20} />
                          </button>
                          <button type="button" data-cy="alternar-situacao" title={t(`admin.setoresIndustriais.acao.${s.ativo ? 'inativar' : 'reativar'}`)} aria-label={t(`admin.setoresIndustriais.acao.${s.ativo ? 'inativar' : 'reativar'}`)} disabled={inativar.isPending || reativar.isPending} onClick={() => alternar(s)} style={{ ...iconeAcao, color: s.ativo ? 'var(--cinza-600, #556)' : 'var(--sucesso)' }}>
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
        <ModalSetor
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

/** Modal único de setor — CRIAR (sem `item`) ou EDITAR (com `item`). Fiel ao protótipo (Código CNAE,
 *  Descrição, Categoria). O código é digitado com máscara `####-#/##` e enviado ao backend só com dígitos. */
function ModalSetor({ item, onFechar, onMudou }: { item?: CatalogoItemView; onFechar: () => void; onMudou: () => void }) {
  const { t } = useTranslation();
  const editando = !!item;
  const [form, setForm] = useState({
    codigo: soDigitosCnae(item?.codigo ?? ''), descricao: item?.descricao ?? '', categoria: item?.categoria ?? '',
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const salvar = useMutation({
    mutationFn: async () => {
      const body = { codigo: form.codigo, descricao: form.descricao.trim(), categoria: form.categoria.trim() };
      if (editando) await api.catalogoEditar(SLUG, item!.id, body);
      else await api.catalogoCriar(SLUG, body);
    },
    onSuccess: () => { onMudou(); onFechar(); },
  });

  const setTexto = (campo: 'descricao' | 'categoria') => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [campo]: e.target.value });
  const setCodigo = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, codigo: soDigitosCnae(e.target.value) });
  const titulo = editando ? t('admin.setoresIndustriais.modal.tituloEditar') : t('admin.setoresIndustriais.modal.tituloCriar');

  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={card} role="dialog" aria-modal="true" aria-label={titulo} data-cy="modal-setor" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--azul-900)' }}>{titulo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('admin.setoresIndustriais.modal.subtitulo')}</p>
          </div>
          <button type="button" onClick={onFechar} style={botaoX} data-cy="fechar-modal" aria-label={t('admin.setoresIndustriais.fechar')}><IconeFechar width={20} height={20} /></button>
        </header>

        <form data-cy="form-setor" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                <span style={rotulo}>{t('admin.setoresIndustriais.campos.codigo')}</span>
                <input className="input" data-cy="campo-codigo" required inputMode="numeric" placeholder={t('admin.setoresIndustriais.modal.codigoPlaceholder')} value={formatarCnae(form.codigo)} onChange={setCodigo} style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }} />
              </label>
              <label>
                <span style={rotulo}>{t('admin.setoresIndustriais.modal.categoriaLabel')}</span>
                <input className="input" data-cy="campo-categoria" placeholder={t('admin.setoresIndustriais.modal.categoriaPlaceholder')} value={form.categoria} onChange={setTexto('categoria')} style={{ width: '100%' }} />
              </label>
            </div>
            <label>
              <span style={rotulo}>{t('admin.setoresIndustriais.campos.descricao')}</span>
              <input className="input" data-cy="campo-descricao" required placeholder={t('admin.setoresIndustriais.modal.descricaoPlaceholder')} value={form.descricao} onChange={setTexto('descricao')} style={{ width: '100%' }} />
            </label>
            <BannerHistorico />
            {salvar.isError && <p role="alert" data-cy="erro-salvar" style={{ margin: 0, fontSize: 13, color: 'var(--erro)' }}>{t('admin.setoresIndustriais.modal.erroSalvar')}</p>}
          </div>
          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--divider)', background: 'var(--cinza-50, #f8fafc)', borderRadius: '0 0 16px 16px' }}>
            <Botao type="button" variante="secundario" data-cy="cancelar" onClick={onFechar}>{t('admin.setoresIndustriais.modal.cancelar')}</Botao>
            <Botao type="submit" data-cy="salvar-setor" disabled={salvar.isPending}>{t('admin.setoresIndustriais.modal.salvar')}</Botao>
          </footer>
        </form>
      </div>
    </div>
  );
}

/** Aviso do protótipo: exclusão é lógica (RN015) — nunca apaga, converte para Inativo, preservando editais. */
function BannerHistorico(): ReactNode {
  const { t } = useTranslation();
  return (
    <div data-cy="banner-historico" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, background: 'var(--azul-50)', color: 'var(--azul-900)', fontSize: 13 }}>
      <IconeInfo width={18} height={18} style={{ flexShrink: 0, marginTop: 1, color: 'var(--azul-700)' }} />
      <span>{t('admin.setoresIndustriais.modal.avisoHistorico')}</span>
    </div>
  );
}
