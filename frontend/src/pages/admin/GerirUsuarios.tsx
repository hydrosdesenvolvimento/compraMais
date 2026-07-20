import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type UsuarioInternoView, type CargoOpcao, type CatalogoItemView } from '../../lib/api';
import { celula, cabecalho } from '../../design-system/tabela';
import { Botao } from '../../design-system/components';
import { IconeLapis, IconeCadeado, IconeFechar } from '../../design-system/icons';

/**
 * Painel Admin · "Usuários" (UC021 / RF023). O Administrador cadastra servidores da Prefeitura e atribui
 * um cargo — o cargo mapeia num papel RBAC (§15/AD-35) e as permissões seguem o papel. Fiel ao protótipo
 * `spec/Prototipo/painel-administrativo.html` (colunas Nome · Cargo · Secretaria · Perfil · Login · Status
 * · Ações + botão "Novo usuário" e modal único criar/editar). Inativação é LÓGICA (RN015): o servidor
 * some do acesso mas o histórico fica; escritas exigem papel Administrador no backend (403 sem o papel).
 *
 * Arbitragem HTML×domínio (ver tela-secretarias): `secretaria` (sigla da unidade demandante) e `login`
 * (identificador de exibição, único — a autenticação segue por e-mail) foram acrescentados ao domínio.
 */

/** Cargo (rótulo RF023, chave canônica) → chave i18n do rótulo apresentável. */
const CARGO_LABEL: Record<string, string> = {
  administrador: 'admin.usuarios.cargos.administrador',
  analista_cpl: 'admin.usuarios.cargos.analistaCpl',
  coordenador_cpl: 'admin.usuarios.cargos.coordenadorCpl',
  secretario: 'admin.usuarios.cargos.secretario',
  gestor: 'admin.usuarios.cargos.gestor',
  auditor: 'admin.usuarios.cargos.auditor',
  dpo: 'admin.usuarios.cargos.dpo',
};

/** Cor da pill de Perfil por papel RBAC (protótipo: administrador cheio; cpl/smga azul claro; auditor âmbar). */
const PERFIL_PILL: Record<string, CSSProperties> = {
  administrador: { background: 'var(--azul-900)', color: '#fff' },
  cpl: { background: 'var(--info-bg)', color: 'var(--azul-700)' },
  smga: { background: 'var(--info-bg)', color: 'var(--azul-700)' },
  auditor: { background: 'var(--ambar-100)', color: 'var(--ambar-700)' },
  dpo: { background: 'var(--cinza-100, #eef1f5)', color: 'var(--cinza-600, #556)' },
  leitura: { background: 'var(--cinza-100, #eef1f5)', color: 'var(--cinza-600, #556)' },
};

const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
const iconeAcao: CSSProperties = { width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--cinza-600, #556)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

type Modal = { modo: 'criar' } | { modo: 'editar'; item: UsuarioInternoView };

export function GerirUsuarios() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState<Modal | null>(null);

  const { data: usuarios = [], isLoading, isError } = useQuery({
    queryKey: ['usuarios-internos'],
    queryFn: () => api.usuariosListar(true),
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['usuarios-internos'] });

  const inativar = useMutation({ mutationFn: (id: string) => api.usuarioInativar(id), onSuccess: () => void invalidar() });
  const reativar = useMutation({ mutationFn: (id: string) => api.usuarioReativar(id), onSuccess: () => void invalidar() });
  const alternar = (u: UsuarioInternoView) => (u.ativo ? inativar : reativar).mutate(u.id);

  const cargoLabel = (cargo: string | null) => (cargo && CARGO_LABEL[cargo] ? t(CARGO_LABEL[cargo]) : (cargo ?? ''));
  const perfilLabel = (papel: string) => t(`admin.usuarios.perfis.${papel}`, { defaultValue: papel });

  const colunas = [
    t('admin.usuarios.campos.nome'),
    t('admin.usuarios.campos.cargo'),
    t('admin.usuarios.campos.secretaria'),
    t('admin.usuarios.campos.perfil'),
    t('admin.usuarios.campos.login'),
    t('admin.usuarios.campos.status'),
    t('admin.usuarios.campos.acoes'),
  ];

  return (
    <div className="stack" data-cy="admin-usuarios">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.usuarios.breadcrumb')}</div>
          <h1 className="page-title">{t('admin.usuarios.titulo')}</h1>
          <p className="page-sub">{t('admin.usuarios.subtitulo')}</p>
        </div>
        <Botao data-cy="novo-cadastro" onClick={() => setModal({ modo: 'criar' })} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span>{t('admin.usuarios.novoCadastro')}
        </Botao>
      </div>

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.usuarios.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.usuarios.erroCarregar')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {usuarios.length === 0 ? (
            <div data-cy="vazio" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.usuarios.vazioTitulo')}</div>
              <div style={{ fontSize: 13.5 }}>{t('admin.usuarios.vazioDica')}</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table data-cy="tabela-usuarios" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', borderRadius: 0 }}>
                <thead>
                  <tr>
                    {colunas.map((c, i) => (
                      <th key={c} scope="col" style={cabecalho(false, i === colunas.length - 1 ? 'right' : 'left')}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} data-cy="item-usuario" data-id={u.id} data-ativo={u.ativo}>
                      <td style={{ ...celula, font: '700 14px var(--font-body)', color: 'var(--azul-900)', whiteSpace: 'nowrap' }}>{u.nome}</td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-800)' }}>{cargoLabel(u.cargo)}</td>
                      <td style={{ ...celula, fontSize: 13.5, color: 'var(--cinza-700)', whiteSpace: 'nowrap' }}>
                        {u.secretaria ?? <span style={{ color: 'var(--cinza-400)' }}>{t('admin.usuarios.semSecretaria')}</span>}
                      </td>
                      <td style={celula}>
                        <span data-cy="perfil" style={{ ...pill, ...(PERFIL_PILL[u.papel] ?? PERFIL_PILL.leitura) }}>{perfilLabel(u.papel)}</span>
                      </td>
                      <td style={{ ...celula, fontSize: 13.5, whiteSpace: 'nowrap' }}>
                        {u.login
                          ? <span data-cy="login" style={{ color: 'var(--azul-700)' }}>{u.login}</span>
                          : <span data-cy="sem-login" style={{ color: 'var(--cinza-400)' }}>{t('admin.usuarios.semLogin')}</span>}
                      </td>
                      <td style={celula}>
                        <span data-cy="status" style={{ ...pill, background: u.ativo ? 'var(--sucesso-bg)' : 'var(--cinza-100, #eef1f5)', color: u.ativo ? 'var(--sucesso)' : 'var(--cinza-500)' }}>
                          {t(`admin.usuarios.status.${u.ativo ? 'ativo' : 'inativo'}`)}
                        </span>
                      </td>
                      <td style={{ ...celula, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button type="button" data-cy="editar" title={t('admin.usuarios.acao.editar')} aria-label={t('admin.usuarios.acao.editar')} onClick={() => setModal({ modo: 'editar', item: u })} style={iconeAcao}>
                            <IconeLapis width={20} height={20} />
                          </button>
                          <button type="button" data-cy="alternar-situacao" title={t(`admin.usuarios.acao.${u.ativo ? 'inativar' : 'reativar'}`)} aria-label={t(`admin.usuarios.acao.${u.ativo ? 'inativar' : 'reativar'}`)} disabled={inativar.isPending || reativar.isPending} onClick={() => alternar(u)} style={{ ...iconeAcao, color: u.ativo ? 'var(--cinza-600, #556)' : 'var(--sucesso)' }}>
                            <IconeCadeado width={20} height={20} />
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
        <ModalUsuario
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

/** Modal único de usuário — CRIAR (sem `item`) ou EDITAR (com `item`). No modo editar, o e-mail é imutável
 *  e a senha é redefinida por ação dedicada (UC015); no modo criar, informa-se a senha inicial. */
function ModalUsuario({ item, onFechar, onMudou }: { item?: UsuarioInternoView; onFechar: () => void; onMudou: () => void }) {
  const { t } = useTranslation();
  const editando = !!item;
  const [form, setForm] = useState({
    nome: item?.nome ?? '', email: item?.email ?? '', cargo: item?.cargo ?? '',
    secretaria: item?.secretaria ?? '', login: item?.login ?? '', senha: '',
  });
  const [resetAberto, setResetAberto] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');

  const { data: cargos = [] } = useQuery({ queryKey: ['cargos'], queryFn: () => api.cargos() });
  const { data: secretarias = [] } = useQuery({ queryKey: ['secretarias-ativas'], queryFn: () => api.catalogoListar('secretarias', false) });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const salvar = useMutation({
    mutationFn: async () => {
      const base = { nome: form.nome.trim(), cargo: form.cargo, secretaria: form.secretaria.trim() || null, login: form.login.trim() || null };
      if (editando) await api.usuarioEditar(item!.id, base);
      else await api.usuarioCriar({ ...base, email: form.email.trim(), senha: form.senha });
    },
    onSuccess: () => { onMudou(); onFechar(); },
  });

  const resetar = useMutation({
    mutationFn: () => api.usuarioResetarSenha(item!.id, novaSenha),
    onSuccess: () => { setNovaSenha(''); },
  });

  const cargoLabel = (c: CargoOpcao) => (CARGO_LABEL[c.cargo] ? t(CARGO_LABEL[c.cargo]) : c.cargo);
  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [campo]: e.target.value });
  const titulo = editando ? t('admin.usuarios.modal.tituloEditar') : t('admin.usuarios.modal.tituloCriar');

  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={card} role="dialog" aria-modal="true" aria-label={titulo} data-cy="modal-usuario" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--azul-900)' }}>{titulo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('admin.usuarios.modal.subtitulo')}</p>
          </div>
          <button type="button" onClick={onFechar} style={botaoX} data-cy="fechar-modal" aria-label={t('admin.usuarios.fechar')}><IconeFechar width={20} height={20} /></button>
        </header>

        <form data-cy="form-usuario" onSubmit={(e) => { e.preventDefault(); salvar.mutate(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                <span style={rotulo}>{t('admin.usuarios.campos.nome')}</span>
                <input className="input" data-cy="campo-nome" required placeholder={t('admin.usuarios.modal.nomePlaceholder')} value={form.nome} onChange={set('nome')} style={{ width: '100%' }} />
              </label>
              <label>
                <span style={rotulo}>{t('admin.usuarios.campos.email')}</span>
                <input className="input" data-cy="campo-email" type="email" required={!editando} disabled={editando} placeholder={t('admin.usuarios.modal.emailPlaceholder')} value={form.email} onChange={set('email')} style={{ width: '100%' }} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                <span style={rotulo}>{t('admin.usuarios.campos.cargo')}</span>
                <select className="input" data-cy="campo-cargo" required value={form.cargo} onChange={set('cargo')} style={{ width: '100%' }}>
                  <option value="">{t('admin.usuarios.selecioneCargo')}</option>
                  {cargos.map((c) => <option key={c.cargo} value={c.cargo}>{cargoLabel(c)}</option>)}
                </select>
              </label>
              <label>
                <span style={rotulo}>{t('admin.usuarios.campos.secretaria')}</span>
                <select className="input" data-cy="campo-secretaria" value={form.secretaria} onChange={set('secretaria')} style={{ width: '100%' }}>
                  <option value="">{t('admin.usuarios.selecioneSecretaria')}</option>
                  {secretarias.map((s: CatalogoItemView) => <option key={s.id} value={s.sigla}>{s.sigla} — {s.nome}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: editando ? '1fr' : '1fr 1fr', gap: 16 }}>
              <label>
                <span style={rotulo}>{t('admin.usuarios.campos.login')}</span>
                <input className="input" data-cy="campo-login" placeholder={t('admin.usuarios.modal.loginPlaceholder')} value={form.login} onChange={set('login')} style={{ width: '100%' }} />
              </label>
              {!editando && (
                <label>
                  <span style={rotulo}>{t('admin.usuarios.campos.senha')}</span>
                  <input className="input" data-cy="campo-senha" type="password" required minLength={8} placeholder={t('admin.usuarios.modal.senhaPlaceholder')} value={form.senha} onChange={set('senha')} style={{ width: '100%' }} />
                </label>
              )}
            </div>

            {editando && (
              <div style={{ borderTop: '1px dashed var(--divider)', paddingTop: 16, display: 'grid', gap: 10 }}>
                <button type="button" data-cy="resetar-senha" onClick={() => { setResetAberto((v) => !v); setNovaSenha(''); resetar.reset(); }} style={{ justifySelf: 'start', background: 'transparent', border: 'none', color: 'var(--azul-700)', font: '600 13px var(--font-body)', cursor: 'pointer', padding: 0 }}>
                  {t('admin.usuarios.resetarSenha')}
                </button>
                {resetAberto && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" data-cy="campo-nova-senha" type="password" minLength={8} placeholder={t('admin.usuarios.novaSenha')} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                    <Botao type="button" variante="secundario" data-cy="confirmar-reset" disabled={resetar.isPending || novaSenha.length < 8} onClick={() => resetar.mutate()}>{t('admin.usuarios.confirmarReset')}</Botao>
                    {resetar.isSuccess && <span data-cy="reset-ok" style={{ color: 'var(--sucesso)', fontSize: 13 }}>{t('admin.usuarios.resetOk')}</span>}
                    {resetar.isError && <span role="alert" style={{ color: 'var(--erro)', fontSize: 13 }}>{t('admin.usuarios.erroReset')}</span>}
                  </div>
                )}
              </div>
            )}

            {salvar.isError && <p role="alert" data-cy="erro-salvar" style={{ margin: 0, fontSize: 13, color: 'var(--erro)' }}>{t('admin.usuarios.modal.erroSalvar')}</p>}
          </div>
          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--divider)', background: 'var(--cinza-50, #f8fafc)', borderRadius: '0 0 16px 16px' }}>
            <Botao type="button" variante="secundario" data-cy="cancelar" onClick={onFechar}>{t('admin.usuarios.modal.cancelar')}</Botao>
            <Botao type="submit" data-cy="salvar-usuario" disabled={salvar.isPending}>{t('admin.usuarios.modal.salvar')}</Botao>
          </footer>
        </form>
      </div>
    </div>
  );
}
