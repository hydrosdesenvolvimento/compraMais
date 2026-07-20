import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { redefinirSenha, type CadastroErro } from '../../lib/br';

/**
 * UC015 · A1 — Redefinir senha via token (destino do link de recuperação). Lê o `token` da URL (hash
 * history: `#/redefinir-senha?token=…`), pede nova senha + confirmação e envia POST /auth/senha/redefinir.
 * Token inválido/expirado → mensagem genérica (não revela conta). Sucesso → volta para o login.
 */
const inputEstilo: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8, font: '15px var(--font-body)', background: '#fff', outline: 'none', color: 'var(--text-title)' };

/** Extrai o token do hash (`#/redefinir-senha?token=…`) de forma resiliente ao hash router. */
function tokenDaUrl(): string {
  const hash = window.location.hash || '';
  const qi = hash.indexOf('?');
  if (qi < 0) return '';
  return new URLSearchParams(hash.slice(qi + 1)).get('token') ?? '';
}

export function RedefinirSenha() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [token] = useState(tokenDaUrl);
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [ver, setVer] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const redefinir = useMutation({ mutationFn: () => redefinirSenha(token, nova) });

  function chaveErro(): string {
    const status = (redefinir.error as CadastroErro | null)?.status;
    if (status === 400) return 'auth.redefinir.erroToken';
    if (status === 422) return 'auth.redefinir.erroFraca';
    return 'auth.redefinir.erroGenerico';
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErroLocal(null);
    if (nova.length < 8) { setErroLocal('auth.redefinir.erroFraca'); return; }
    if (nova !== confirma) { setErroLocal('auth.redefinir.erroConfirma'); return; }
    redefinir.mutate();
  }

  if (!token) {
    return (
      <div data-cy="redefinir-sem-token">
        <h2 style={{ fontSize: 21, margin: '0 0 10px' }}>{t('auth.redefinir.title')}</h2>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--erro)', lineHeight: 1.55 }}>{t('auth.redefinir.erroToken')}</p>
        <button type="button" onClick={() => void navigate({ to: '/cadastro' })} className="btn btn-primary btn-block" style={{ padding: 13, fontSize: 15 }}>{t('auth.redefinir.irLogin')}</button>
      </div>
    );
  }

  if (redefinir.isSuccess) {
    return (
      <div data-cy="redefinir-sucesso">
        <h2 style={{ fontSize: 21, margin: '0 0 10px' }}>{t('auth.redefinir.sucessoTitle')}</h2>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--cinza-500)', lineHeight: 1.55 }}>{t('auth.redefinir.sucessoInfo')}</p>
        <button type="button" data-cy="redefinir-ir-login" onClick={() => void navigate({ to: '/cadastro' })} className="btn btn-primary btn-block" style={{ padding: 13, fontSize: 15 }}>{t('auth.redefinir.irLogin')}</button>
      </div>
    );
  }

  const tipoInput = ver ? 'text' : 'password';
  const erroExibido = erroLocal ?? (redefinir.isError ? chaveErro() : null);

  return (
    <form onSubmit={submeter}>
      <h2 style={{ fontSize: 21, margin: '0 0 4px', letterSpacing: '-0.01em' }}>{t('auth.redefinir.title')}</h2>
      <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--cinza-500)', lineHeight: 1.5 }}>{t('auth.redefinir.subtitle')}</p>

      <label className="label" htmlFor="nova" style={{ marginBottom: 7 }}>{t('auth.redefinir.novaSenha')}</label>
      <input id="nova" data-cy="redefinir-nova" type={tipoInput} autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} placeholder={t('auth.redefinir.novaSenhaPlaceholder')} style={{ ...inputEstilo, marginBottom: 16 }} />

      <label className="label" htmlFor="confirma" style={{ marginBottom: 7 }}>{t('auth.redefinir.confirmar')}</label>
      <input id="confirma" data-cy="redefinir-confirma" type={tipoInput} autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} placeholder={t('auth.redefinir.confirmarPlaceholder')} style={{ ...inputEstilo, marginBottom: 12 }} />

      <button type="button" onClick={() => setVer((v) => !v)} style={{ border: 'none', background: 'none', color: 'var(--azul-700)', font: '600 12.5px var(--font-body)', cursor: 'pointer', padding: 0, marginBottom: 18 }}>
        {ver ? t('auth.login.hide') : t('auth.login.show')}
      </button>

      {erroExibido && <p data-cy="redefinir-erro" style={{ color: 'var(--erro)', marginBottom: 12, fontSize: 13 }}>{t(erroExibido)}</p>}
      <button data-cy="redefinir-enviar" type="submit" className="btn btn-primary btn-block" style={{ padding: 13, fontSize: 15 }} disabled={redefinir.isPending}>{redefinir.isPending ? t('auth.redefinir.enviando') : t('auth.redefinir.enviar')}</button>
    </form>
  );
}
