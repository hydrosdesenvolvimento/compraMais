import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type UsuarioInternoView } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';

/**
 * UC021 — Gerir Usuários Internos (Painel Admin). O Administrador cadastra servidores (Nome, E-mail,
 * Cargo) — o cargo mapeia num papel RBAC (§15/AD-35) — reseta senhas e inativa (RN015: some da lista
 * padrão, toggle "mostrar inativos", pode reativar). Escritas exigem RBAC Administrador no backend (403
 * sem o papel). Distinto do autocadastro do fornecedor: aqui só se criam contas de servidor.
 */
const CARGO_LABEL: Record<string, string> = {
  administrador: 'admin.usuarios.cargos.administrador',
  analista_cpl: 'admin.usuarios.cargos.analistaCpl',
  coordenador_cpl: 'admin.usuarios.cargos.coordenadorCpl',
  secretario: 'admin.usuarios.cargos.secretario',
  gestor: 'admin.usuarios.cargos.gestor',
  auditor: 'admin.usuarios.cargos.auditor',
  dpo: 'admin.usuarios.cargos.dpo',
};

const VAZIO = { nome: '', email: '', cargo: '', senha: '' };

export function GerirUsuarios() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [resetId, setResetId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState('');

  const { data: cargos = [] } = useQuery({ queryKey: ['cargos'], queryFn: () => api.cargos() });
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-internos', incluirInativos],
    queryFn: () => api.usuariosListar(incluirInativos),
  });
  const invalidar = () => qc.invalidateQueries({ queryKey: ['usuarios-internos'] });

  const criar = useMutation({
    mutationFn: (v: typeof VAZIO) => api.usuarioCriar(v),
    onSuccess: () => { setForm(VAZIO); void invalidar(); },
  });
  const inativar = useMutation({ mutationFn: (id: string) => api.usuarioInativar(id), onSuccess: () => void invalidar() });
  const reativar = useMutation({ mutationFn: (id: string) => api.usuarioReativar(id), onSuccess: () => void invalidar() });
  const resetar = useMutation({
    mutationFn: (v: { id: string; senha: string }) => api.usuarioResetarSenha(v.id, v.senha),
    onSuccess: () => { setResetId(null); setNovaSenha(''); },
  });

  const cargoLabel = (cargo: string) => (CARGO_LABEL[cargo] ? t(CARGO_LABEL[cargo]) : cargo);

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{t('admin.usuarios.titulo')}</h1>
        <p className="page-sub">{t('admin.usuarios.subtitulo')}</p>
      </div>

      <Card>
        <form data-cy="form-usuario" onSubmit={(e) => { e.preventDefault(); criar.mutate(form); }} style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.usuarios.campos.nome')}
            <input data-cy="campo-nome" className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </label>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.usuarios.campos.email')}
            <input data-cy="campo-email" className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.usuarios.campos.cargo')}
            <select data-cy="campo-cargo" className="input" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}>
              <option value="">{t('admin.usuarios.selecioneCargo')}</option>
              {cargos.map((c) => <option key={c.cargo} value={c.cargo}>{cargoLabel(c.cargo)} ({c.papel})</option>)}
            </select>
          </label>
          <label className="label" style={{ display: 'grid', gap: 4 }}>
            {t('admin.usuarios.campos.senha')}
            <input data-cy="campo-senha" className="input" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          </label>
          <Botao data-cy="criar" type="submit" disabled={criar.isPending}>{t('admin.usuarios.criar')}</Botao>
          {criar.isError && <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.usuarios.erroCriar')}</p>}
        </form>
      </Card>

      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input data-cy="mostrar-inativos" type="checkbox" checked={incluirInativos} onChange={(e) => setIncluirInativos(e.target.checked)} />
        {t('admin.usuarios.mostrarInativos')}
      </label>

      {usuarios.length === 0 ? (
        <p data-cy="vazio" className="page-sub">{t('admin.usuarios.vazio')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {usuarios.map((u: UsuarioInternoView) => (
            <li key={u.id} data-cy="item-usuario" data-ativo={u.ativo} className="card" style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }}>
                  <strong>{u.nome}</strong> — {u.email}
                  <em style={{ color: 'var(--texto-suave)' }}> · {u.cargo ? cargoLabel(u.cargo) : u.papel} ({u.papel})</em>
                  {!u.ativo && <em style={{ color: 'var(--texto-suave)' }}> — {t('admin.usuarios.situacaoInativo')}</em>}
                </span>
                <Botao data-cy="resetar-senha" variante="secundario" onClick={() => { setResetId(resetId === u.id ? null : u.id); setNovaSenha(''); }}>
                  {t('admin.usuarios.resetarSenha')}
                </Botao>
                {u.ativo
                  ? <Botao data-cy="inativar" variante="secundario" onClick={() => inativar.mutate(u.id)}>{t('admin.usuarios.inativar')}</Botao>
                  : <Botao data-cy="reativar" onClick={() => reativar.mutate(u.id)}>{t('admin.usuarios.reativar')}</Botao>}
              </div>
              {resetId === u.id && (
                <form data-cy="form-reset" onSubmit={(e) => { e.preventDefault(); resetar.mutate({ id: u.id, senha: novaSenha }); }}
                  style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input data-cy="campo-nova-senha" className="input" type="password" placeholder={t('admin.usuarios.novaSenha')}
                    value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
                  <Botao data-cy="confirmar-reset" type="submit" disabled={resetar.isPending}>{t('admin.usuarios.confirmarReset')}</Botao>
                  {resetar.isSuccess && <span data-cy="reset-ok" style={{ color: 'var(--sucesso, #178a4a)' }}>{t('admin.usuarios.resetOk')}</span>}
                  {resetar.isError && <span role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.usuarios.erroReset')}</span>}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
