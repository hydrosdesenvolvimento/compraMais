import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoItemView } from '../../lib/api';
import { celula, cabecalho } from '../../design-system/tabela';
import { Botao, BotaoIcone } from '../../design-system/components';
import { IconeLapis, IconePower, IconeFechar, IconeInfo } from '../../design-system/icons';

/**
 * Painel Admin · "Secretarias" (RF020 / AD-16). Lista as unidades demandantes com sigla, nome,
 * responsável, contato e situação; ações de editar e ativar/inativar (exclusão lógica RN015). Fiel ao
 * protótipo `spec/Prototipo/painel-administrativo.html` (colunas Sigla · Nome · Responsável · Contato ·
 * Status · Ações). Reusa o CRUD genérico de catálogos (GET/POST/PATCH/POST inativar|reativar
 * `/catalogos/secretarias`). Lista inclui inativos (o protótipo mostra ativas e inativas juntas, cada uma
 * com sua pill); o e-mail de `contato` é o campo acrescentado ao domínio para esta tela.
 */
const SLUG = 'secretarias' as const;

const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };

type Modal = { modo: 'criar' } | { modo: 'editar'; item: CatalogoItemView };

export function Secretarias() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState<Modal | null>(null);

  const { data: itens = [], isLoading, isError } = useQuery({
    queryKey: ['secretarias-admin'],
    queryFn: () => api.catalogoListar(SLUG, true),
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['secretarias-admin'] });

  const inativar = useMutation({ mutationFn: (id: string) => api.catalogoInativar(SLUG, id), onSuccess: () => void invalidar() });
  const reativar = useMutation({ mutationFn: (id: string) => api.catalogoReativar(SLUG, id), onSuccess: () => void invalidar() });
  const alternar = (i: CatalogoItemView) => (i.ativo ? inativar : reativar).mutate(i.id);

  const colunas = [
    t('admin.secretarias.campos.sigla'),
    t('admin.secretarias.campos.nome'),
    t('admin.secretarias.campos.responsavel'),
    t('admin.secretarias.campos.contato'),
    t('admin.secretarias.campos.status'),
    t('admin.secretarias.campos.acoes'),
  ];

  return (
    <div className="stack" data-cy="admin-secretarias">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{t('admin.secretarias.titulo')}</h1>
          <p className="page-sub">{t('admin.secretarias.subtitulo')}</p>
        </div>
        <Botao data-cy="novo-cadastro" onClick={() => setModal({ modo: 'criar' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span>{t('admin.secretarias.novoCadastro')}
        </Botao>
      </div>

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.secretarias.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.secretarias.erroCarregar')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {itens.length === 0 ? (
            <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.secretarias.vazioTitulo')}</div>
              <div style={{ fontSize: 13.5 }}>{t('admin.secretarias.vazioDica')}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table data-cy="tabela-secretarias" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                <thead>
                  <tr>
                    {colunas.map((c, i) => (
                      <th key={c} scope="col" style={cabecalho(false, i === colunas.length - 1 ? 'right' : 'left')}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((s) => (
                    <tr key={s.id} data-cy="item-secretaria" data-id={s.id} data-ativo={s.ativo}>
                      <td style={{ ...celula, font: '700 14px var(--font-body)', color: 'var(--azul-900)', whiteSpace: 'nowrap' }}>{s.sigla}</td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-800)', minWidth: 220 }}>{s.nome}</td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-700)' }}>{s.responsavel}</td>
                      <td style={{ ...celula, fontSize: 13.5, whiteSpace: 'nowrap' }}>
                        {s.contato
                          ? <a data-cy="contato" href={`mailto:${s.contato}`} style={{ color: 'var(--azul-700)', textDecoration: 'none' }}>{s.contato}</a>
                          : <span data-cy="sem-contato" style={{ color: 'var(--cinza-400)' }}>{t('admin.secretarias.semContato')}</span>}
                      </td>
                      <td style={celula}>
                        <span data-cy="status" style={{ ...pill, background: s.ativo ? 'var(--sucesso-bg)' : 'var(--cinza-100, #eef1f5)', color: s.ativo ? 'var(--sucesso)' : 'var(--cinza-500)' }}>
                          {t(`admin.secretarias.status.${s.ativo ? 'ativa' : 'inativa'}`)}
                        </span>
                      </td>
                      <td style={{ ...celula, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                          <BotaoIcone icone={IconeLapis} data-cy="editar" title={t('admin.secretarias.acao.editar')} aria-label={t('admin.secretarias.acao.editar')} onClick={() => setModal({ modo: 'editar', item: s })} />
                          <BotaoIcone icone={IconePower} data-cy="alternar-situacao" title={t(`admin.secretarias.acao.${s.ativo ? 'inativar' : 'reativar'}`)} aria-label={t(`admin.secretarias.acao.${s.ativo ? 'inativar' : 'reativar'}`)} disabled={inativar.isPending || reativar.isPending} onClick={() => alternar(s)} style={{ color: s.ativo ? 'var(--cinza-600, #556)' : 'var(--sucesso)' }} />
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
        <ModalSecretaria
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
const rotulo: CSSProperties = { font: '600 13px var(--font-body)', color: 'var(--azul-900)', marginBottom: 6, display: 'block' };

/** Modal único de secretaria — CRIAR (sem `item`) ou EDITAR (com `item`). Fiel ao protótipo. */
function ModalSecretaria({ item, onFechar, onMudou }: { item?: CatalogoItemView; onFechar: () => void; onMudou: () => void }) {
  const { t } = useTranslation();
  const editando = !!item;
  const [form, setForm] = useState({
    sigla: item?.sigla ?? '', nome: item?.nome ?? '', responsavel: item?.responsavel ?? '', contato: item?.contato ?? '',
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const salvar = useMutation({
    mutationFn: async () => {
      const body = { sigla: form.sigla.trim(), nome: form.nome.trim(), responsavel: form.responsavel.trim(), contato: form.contato.trim() };
      if (editando) await api.catalogoEditar(SLUG, item!.id, body);
      else await api.catalogoCriar(SLUG, body);
    },
    onSuccess: () => { onMudou(); onFechar(); },
  });

  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [campo]: e.target.value });
  const titulo = editando ? t('admin.secretarias.modal.tituloEditar') : t('admin.secretarias.modal.tituloCriar');

  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={card} role="dialog" aria-modal="true" aria-label={titulo} data-cy="modal-secretaria" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--azul-900)' }}>{titulo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('admin.secretarias.modal.subtitulo')}</p>
          </div>
          <BotaoIcone icone={IconeFechar} variante="fechar" onClick={onFechar} data-cy="fechar-modal" aria-label={t('admin.secretarias.fechar')} />
        </header>

        <form data-cy="form-secretaria" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                <span style={rotulo}>{t('admin.secretarias.campos.sigla')}</span>
                <input className="input" data-cy="campo-sigla" required placeholder={t('admin.secretarias.modal.siglaPlaceholder')} value={form.sigla} onChange={set('sigla')} style={{ width: '100%' }} />
              </label>
              <label>
                <span style={rotulo}>{t('admin.secretarias.campos.nome')}</span>
                <input className="input" data-cy="campo-nome" required placeholder={t('admin.secretarias.modal.nomePlaceholder')} value={form.nome} onChange={set('nome')} style={{ width: '100%' }} />
              </label>
            </div>
            <label>
              <span style={rotulo}>{t('admin.secretarias.campos.responsavel')}</span>
              <input className="input" data-cy="campo-responsavel" required placeholder={t('admin.secretarias.modal.responsavelPlaceholder')} value={form.responsavel} onChange={set('responsavel')} style={{ width: '100%' }} />
            </label>
            <label>
              <span style={rotulo}>{t('admin.secretarias.modal.contatoLabel')}</span>
              <input className="input" data-cy="campo-contato" type="email" required placeholder={t('admin.secretarias.modal.contatoPlaceholder')} value={form.contato} onChange={set('contato')} style={{ width: '100%' }} />
            </label>
            <BannerHistorico />
            {salvar.isError && <p role="alert" data-cy="erro-salvar" style={{ margin: 0, fontSize: 13, color: 'var(--erro)' }}>{t('admin.secretarias.modal.erroSalvar')}</p>}
          </div>
          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--divider)', background: 'var(--cinza-50, #f8fafc)', borderRadius: '0 0 16px 16px' }}>
            <Botao type="button" variante="secundario" data-cy="cancelar" onClick={onFechar}>{t('admin.secretarias.modal.cancelar')}</Botao>
            <Botao type="submit" data-cy="salvar-secretaria" disabled={salvar.isPending}>{t('admin.secretarias.modal.salvar')}</Botao>
          </footer>
        </form>
      </div>
    </div>
  );
}

/** Aviso do protótipo: exclusão é lógica (RN015) — nunca apaga, converte para Inativo/Bloqueado. */
function BannerHistorico(): ReactNode {
  const { t } = useTranslation();
  return (
    <div data-cy="banner-historico" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, background: 'var(--azul-50)', color: 'var(--azul-900)', fontSize: 13 }}>
      <IconeInfo width={18} height={18} style={{ flexShrink: 0, marginTop: 1, color: 'var(--azul-700)' }} />
      <span>{t('admin.secretarias.modal.avisoHistorico')}</span>
    </div>
  );
}
