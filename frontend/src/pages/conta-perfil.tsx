import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Botao } from '../design-system/components';
import { IconeCadeado, IconeCamera, IconeCheck } from '../design-system/icons';
import { api } from '../lib/api';

/**
 * Blocos reutilizáveis da "Minha conta" (fornecedor e servidor): foto de perfil, troca de senha e
 * campos read-only. Foto e senha pertencem ao PRÓPRIO usuário autenticado (GET/PATCH /auth/perfil,
 * POST /auth/senha) — independem do perfil (fornecedor/admin), por isso vivem aqui.
 */

/** Foto de perfil: formatos aceitos e limite (coerente com AVATAR_MAX_BYTES do backend). */
export const AVATAR_MIME = ['image/png', 'image/jpeg', 'image/webp'];
export const AVATAR_MAX_MB = 1.5;

/** Lê um arquivo como data URL completo (`data:<mime>;base64,...`) para enviar ao backend. */
function lerDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('read error'));
    r.readAsDataURL(file);
  });
}

/** Iniciais (até 2) de um nome, para o avatar textual quando não há foto. */
export function iniciaisDe(nome: string): string {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}

/** Rótulo de seção maiúsculo (ex.: "DADOS OFICIAIS · RECEITA FEDERAL"). */
export function SecaoLabel({ children, cor = 'var(--azul-700)', icone }: { children: ReactNode; cor?: string; icone?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px' }}>
      {icone}
      <span style={{ font: '600 11px var(--font-body)', letterSpacing: '.08em', color: cor }}>{children}</span>
    </div>
  );
}

/** Campo somente-leitura no estilo do mockup (fundo azul tint). */
export function CampoOficial({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div style={{ font: '600 11.5px var(--font-body)', color: 'var(--cinza-500)', marginBottom: 5 }}>{rotulo}</div>
      <div style={{ padding: '11px 14px', background: 'var(--azul-50)', border: '1px solid var(--azul-100)', borderRadius: 9, fontSize: 14, color: 'var(--azul-900)' }}>{valor}</div>
    </div>
  );
}

/**
 * Bloco da foto de perfil: preview (imagem ou iniciais) + trocar/remover foto (PATCH /auth/perfil).
 * `titulo`/`subtitulo` são o rótulo ao lado da foto (default: "Responsável legal · {fantasia}", usado
 * pelo fornecedor; o servidor passa o nome + papel/secretaria).
 */
export function FotoResponsavel({ avatar, nome, fantasia = '', carregando, titulo, subtitulo }: {
  avatar: string | null; nome: string; fantasia?: string; carregando: boolean; titulo?: string; subtitulo?: string;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);

  const fotoMut = useMutation({
    mutationFn: (avatarPatch: string | null) => api.atualizarPerfilProprio({ avatar: avatarPatch }),
    onSuccess: (atualizado) => { qc.setQueryData(['perfil-proprio'], atualizado); setErro(null); },
  });

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo arquivo
    if (!file) return;
    setErro(null);
    if (!AVATAR_MIME.includes(file.type)) { setErro(t('minhaConta.responsavel.fotoErroTipo')); return; }
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) { setErro(t('minhaConta.responsavel.fotoErroTamanho', { mb: AVATAR_MAX_MB })); return; }
    try {
      fotoMut.mutate(await lerDataUrl(file));
    } catch {
      setErro(t('minhaConta.responsavel.fotoErro'));
    }
  }

  const erroExibido = erro ?? (fotoMut.isError ? t('minhaConta.responsavel.fotoErro') : null);
  const tituloExibido = titulo ?? t('minhaConta.responsavel.responsavelLegal');
  const subtituloExibido = subtitulo ?? `${t('minhaConta.responsavel.procurador')} · ${fantasia}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', paddingBottom: 22, borderBottom: '1px solid var(--divider)' }}>
      {avatar ? (
        <img data-cy="avatar-foto" src={avatar} alt={tituloExibido} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--divider)' }} />
      ) : (
        <span className="avatar" data-cy="avatar-iniciais" style={{ width: 80, height: 80, fontSize: 28, flexShrink: 0 }}>{iniciaisDe(nome || fantasia)}</span>
      )}
      <div>
        <div style={{ font: '600 17px var(--font-body)', color: 'var(--azul-900)' }}>{tituloExibido}</div>
        <div style={{ fontSize: 13.5, color: 'var(--cinza-500)', margin: '2px 0 12px' }}>{subtituloExibido}</div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" data-cy="avatar-input" onChange={escolher} style={{ display: 'none' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button data-cy="alterar-foto" className="btn btn-ghost" style={{ padding: '9px 16px', fontSize: 13.5 }} type="button" disabled={carregando || fotoMut.isPending} onClick={() => inputRef.current?.click()}>
            <IconeCamera width={16} height={16} /> {fotoMut.isPending ? t('minhaConta.responsavel.salvando') : t('minhaConta.responsavel.alterarFoto')}
          </button>
          {avatar && (
            <button data-cy="remover-foto" type="button" disabled={fotoMut.isPending} onClick={() => { setErro(null); fotoMut.mutate(null); }}
              style={{ border: 'none', background: 'none', color: 'var(--erro)', font: '600 13px var(--font-body)', cursor: 'pointer', textDecoration: 'underline' }}>
              {t('minhaConta.responsavel.removerFoto')}
            </button>
          )}
        </div>
        {erroExibido && <small data-cy="foto-erro" role="alert" style={{ display: 'block', color: 'var(--erro)', marginTop: 8 }}>{erroExibido}</small>}
      </div>
    </div>
  );
}

interface HttpErrorLike { status?: number }

/**
 * Formulário de troca da própria senha (UC015 · A2). Exige senha atual + nova + confirmação; valida
 * localmente (mín. 8, confirmação igual) e envia POST /auth/senha (Bearer). Mapeia o erro do backend:
 * 400 = senha atual incorreta; 422 = senha fraca; 401 = sessão expirada.
 */
export function TrocaSenhaForm({ onFechar }: { onFechar: () => void }) {
  const { t } = useTranslation();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [ver, setVer] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const trocar = useMutation({
    mutationFn: () => api.trocarSenha(atual, nova),
    onSuccess: () => { setAtual(''); setNova(''); setConfirma(''); },
  });

  function chaveErro(): string {
    const status = (trocar.error as HttpErrorLike | null)?.status;
    if (status === 400) return 'minhaConta.responsavel.erroAtual';
    if (status === 422) return 'minhaConta.responsavel.erroFraca';
    if (status === 401) return 'minhaConta.responsavel.sessaoExpirada';
    return 'minhaConta.responsavel.erroGenerico';
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErroLocal(null);
    if (nova.length < 8) { setErroLocal('minhaConta.responsavel.erroFraca'); return; }
    if (nova !== confirma) { setErroLocal('minhaConta.responsavel.erroConfirma'); return; }
    trocar.mutate();
  }

  if (trocar.isSuccess) {
    return (
      <div data-cy="senha-sucesso" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, color: 'var(--sucesso)', fontSize: 13.5 }}>
        <IconeCheck width={16} height={16} strokeWidth={2.2} /> {t('minhaConta.responsavel.sucesso')}
        <button type="button" onClick={onFechar} style={{ border: 'none', background: 'none', color: 'var(--azul-700)', font: '600 13.5px var(--font-body)', cursor: 'pointer', textDecoration: 'underline' }}>
          {t('minhaConta.responsavel.fechar')}
        </button>
      </div>
    );
  }

  const tipoInput = ver ? 'text' : 'password';
  const erroExibido = erroLocal ?? (trocar.isError ? chaveErro() : null);

  return (
    <form onSubmit={submeter} style={{ marginTop: 6, display: 'grid', gap: 12, maxWidth: 420 }}>
      <input data-cy="senha-atual" className="input" type={tipoInput} autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} placeholder={t('minhaConta.responsavel.senhaAtualPlaceholder')} />
      <input data-cy="senha-nova" className="input" type={tipoInput} autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} placeholder={t('minhaConta.responsavel.novaSenhaPlaceholder')} />
      <input data-cy="senha-confirma" className="input" type={tipoInput} autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder={t('minhaConta.responsavel.confirmarPlaceholder')} />

      <button type="button" onClick={() => setVer((v) => !v)} style={{ justifySelf: 'start', border: 'none', background: 'none', color: 'var(--azul-700)', font: '600 12.5px var(--font-body)', cursor: 'pointer', padding: 0 }}>
        {ver ? t('minhaConta.responsavel.ocultar') : t('minhaConta.responsavel.ver')}
      </button>

      {erroExibido && <small data-cy="senha-erro" style={{ color: 'var(--erro)' }}>{t(erroExibido)}</small>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Botao data-cy="salvar-senha" variante="primario" type="submit" disabled={trocar.isPending} style={{ padding: '11px 20px' }}>
          <IconeCadeado width={15} height={15} /> {trocar.isPending ? t('minhaConta.responsavel.salvando') : t('minhaConta.responsavel.salvarSenha')}
        </Botao>
        <button type="button" onClick={onFechar} style={{ border: 'none', background: 'none', color: 'var(--cinza-500)', font: '600 13.5px var(--font-body)', cursor: 'pointer', textDecoration: 'underline' }}>
          {t('minhaConta.responsavel.cancelar')}
        </button>
      </div>
    </form>
  );
}
