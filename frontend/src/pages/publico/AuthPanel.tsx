import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import { cadastrarFornecedor, consultarCnpj, consultarCep, login, mascaraCnpj, mascaraCep, soDigitos, type CadastroErro, type DadosCnpj, type EnderecoCep, type EnderecoEstruturado } from '../../lib/br';
import { salvarToken } from '../../lib/auth';

/**
 * AuthPanel — cartão de acesso do AuthLayout (mockup Compra Mais). Abas Entrar / Criar conta.
 * Cadastro por CNPJ (autofill Receita: razão social, porte, situação, QSA e endereço; autofill de
 * logradouro por CEP; fallback manual). Login local (POST /auth/login → JWT) navega para /inicio.
 * Toda a lógica e os hooks data-cy do contrato de teste são preservados.
 */

function linhaLogradouro(dados: DadosCnpj | null, cep: EnderecoCep | null): string {
  const src = cep
    ? { logradouro: cep.rua, bairro: cep.bairro, cidade: cep.cidade, uf: cep.estado }
    : dados?.endereco ?? null;
  if (!src) return '';
  const via = [src.logradouro, src.bairro].filter(Boolean).join(' — ');
  const cidade = [src.cidade, src.uf].filter(Boolean).join('/');
  return [via, cidade].filter(Boolean).join(', ');
}

function numeroInicial(numero: string): string {
  return /^\s*s\/?n\s*$/i.test(numero) ? '' : numero;
}

/** Monta o endereço estruturado geolocalizável (RF019) a partir do CNPJ/CEP + número/complemento. */
function montarEndereco(
  dados: DadosCnpj | null,
  cep: EnderecoCep | null,
  campos: { cep: string; numero: string; complemento: string },
): EnderecoEstruturado | undefined {
  const base = cep
    ? { logradouro: cep.rua, bairro: cep.bairro, cidade: cep.cidade, uf: cep.estado, latitude: cep.latitude, longitude: cep.longitude }
    : dados?.endereco
      ? { logradouro: dados.endereco.logradouro, bairro: dados.endereco.bairro, cidade: dados.endereco.cidade, uf: dados.endereco.uf }
      : null;
  if (!base) return undefined;
  return { ...base, numero: campos.numero, complemento: campos.complemento || undefined, cep: soDigitos(campos.cep) };
}

/** Mapeia o erro do backend para a chave i18n de mensagem do cadastro. */
function chaveErroCadastro(e: unknown): string {
  const codigo = (e as CadastroErro)?.codigo;
  if (codigo === 'CnpjInvalido') return 'auth.signup.errors.cnpjInvalido';
  if (codigo === 'SituacaoNaoApta') return 'auth.signup.errors.situacao';
  if (codigo === 'CnpjJaCadastrado') return 'auth.signup.errors.cnpjDuplicado';
  if (codigo === 'EmailJaCadastrado') return 'auth.signup.errors.emailDuplicado';
  return 'auth.signup.errors.generico';
}

/** Rótulo maiúsculo (mockup) para campos de leitura/edição. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return <div style={{ font: '600 11.5px var(--font-body)', color: 'var(--cinza-500)', marginBottom: 5, letterSpacing: '.02em' }}>{children}</div>;
}
/** Caixa de leitura (read-only) no tom azul-50 do mockup. */
function Leitura({ children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} style={{ padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--azul-50)', font: '14px var(--font-body)', color: 'var(--text-title)' }}>{children}</div>;
}
const inputEstilo: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8, font: '15px var(--font-body)', background: '#fff', outline: 'none', color: 'var(--text-title)' };

export function AuthPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [aba, setAba] = useState<'entrar' | 'criar'>('criar');
  const [verSenha, setVerSenha] = useState(false);
  const [verSenhaCad, setVerSenhaCad] = useState(false);
  const [consentido, setConsentido] = useState(false);
  const [manter, setManter] = useState(true);

  const cepMut = useMutation({ mutationFn: (cep: string) => consultarCep(cep) });

  const cadastro = useForm({
    defaultValues: { cnpj: '', cep: '', numero: '', complemento: '', nomeFantasia: '', telefone: '', email: '', senha: '' },
    onSubmit: async () => { /* submissão via cadastroMut (usa dados do CNPJ/CEP em closure) */ },
  });

  const cnpjMut = useMutation({
    mutationFn: (cnpj: string) => consultarCnpj(cnpj),
    onSuccess: (d) => {
      cepMut.reset();
      if (d?.endereco) {
        cadastro.setFieldValue('cep', mascaraCep(d.endereco.cep));
        cadastro.setFieldValue('numero', numeroInicial(d.endereco.numero));
        cadastro.setFieldValue('complemento', d.endereco.complemento);
      }
    },
  });
  const dados = cnpjMut.data ?? null;
  const indisponivel = (cnpjMut.isSuccess && !cnpjMut.data) || cnpjMut.isError;

  // Submissão do cadastro (UC001): POST /fornecedores → auto-login → portal (pós-condição "acesso ao Portal").
  const cadastroMut = useMutation({
    mutationFn: async (v: { cnpj: string; cep: string; numero: string; complemento: string; nomeFantasia: string; telefone: string; email: string; senha: string }) => {
      const endereco = montarEndereco(dados, cepMut.data ?? null, v);
      await cadastrarFornecedor({
        cnpjRaw: v.cnpj,
        contato: { nomeFantasia: v.nomeFantasia || undefined, telefone: v.telefone || undefined, endereco },
        consentimento: { finalidade: 'credenciamento', versaoTermo: 'v1' },
        titular: { identificador: v.email },
        senha: v.senha,
        nome: dados?.razaoSocial,
      });
      return login(v.email, v.senha);
    },
    onSuccess: (r) => { salvarToken(r.token); void navigate({ to: '/inicio' }); },
  });

  const loginMut = useMutation({
    mutationFn: (v: { email: string; senha: string }) => login(v.email, v.senha),
    onSuccess: (r) => { salvarToken(r.token); void navigate({ to: '/inicio' }); },
  });
  const formLogin = useForm({ defaultValues: { email: '', senha: '' }, onSubmit: async ({ value }) => { await loginMut.mutateAsync(value).catch(() => { /* erro via loginMut.isError */ }); } });

  function buscarCep(valor: string) { if (valor.replace(/\D/g, '').length === 8) cepMut.mutate(valor); }

  return (
    <>
      <div className="auth-tabs" role="tablist">
        <button data-cy="aba-entrar" className={`auth-tab ${aba === 'entrar' ? 'active' : ''}`} onClick={() => setAba('entrar')}>{t('auth.tabs.login')}</button>
        <button data-cy="aba-criar" className={`auth-tab ${aba === 'criar' ? 'active' : ''}`} onClick={() => setAba('criar')}>{t('auth.tabs.signup')}</button>
      </div>

      {aba === 'criar' ? (
        <form onSubmit={(e) => { e.preventDefault(); if (dados && consentido) cadastroMut.mutate(cadastro.state.values); }}>
          <h2 style={{ fontSize: 21, margin: '0 0 4px', letterSpacing: '-0.01em' }}>{t('auth.signup.title')}</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--cinza-500)', lineHeight: 1.5 }}>{t('auth.signup.subtitle')}</p>

          <cadastro.Field name="cnpj">
            {(f) => (
              <>
                <label className="label" htmlFor="cnpj" style={{ marginBottom: 7 }}>{t('auth.signup.cnpjLabel')}</label>
                <div style={{ position: 'relative', marginBottom: 4 }}>
                  <input id="cnpj" data-cy="cnpj" inputMode="numeric" value={f.state.value} placeholder={t('auth.signup.cnpjPlaceholder')}
                    onChange={(e) => { cnpjMut.reset(); f.handleChange(mascaraCnpj(e.target.value)); }}
                    style={{ ...inputEstilo, paddingRight: 108 }} />
                  <button data-cy="consultar" type="button" onClick={() => cnpjMut.mutate(f.state.value)} disabled={cnpjMut.isPending}
                    style={{ position: 'absolute', right: 6, top: 6, bottom: 6, padding: '0 16px', border: 'none', borderRadius: 6, background: 'var(--azul-700)', color: '#fff', font: '600 13px var(--font-body)', cursor: 'pointer', opacity: cnpjMut.isPending ? 0.6 : 1 }}>{t('auth.signup.consult')}</button>
                </div>
              </>
            )}
          </cadastro.Field>

          {cnpjMut.isPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, padding: '13px 15px', background: 'var(--azul-50)', borderRadius: 10, color: 'var(--azul-800)', fontSize: 14, fontWeight: 500 }}>
              <span style={{ width: 18, height: 18, border: '2.5px solid var(--azul-100)', borderTopColor: 'var(--azul-700)', borderRadius: '50%', display: 'inline-block', animation: 'cmspin .7s linear infinite' }} />
              {t('auth.signup.loading')}
            </div>
          )}

          {dados && (
            <div style={{ marginTop: 18, display: 'grid', gap: 13, animation: 'cmfade .35s' }}>
              <div><Rotulo>{t('auth.signup.razaoSocial')}</Rotulo><Leitura><input data-cy="razao-social" readOnly value={dados.razaoSocial} style={{ all: 'unset', width: '100%', font: '14px var(--font-body)', color: 'var(--text-title)' }} /></Leitura></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <div><Rotulo>{t('auth.signup.porte')}</Rotulo><Leitura>{dados.porte}</Leitura></div>
                <div><Rotulo>{t('auth.signup.situacao')}</Rotulo><Leitura>{dados.situacaoCadastral}</Leitura></div>
              </div>

              {(dados.endereco || cepMut.data) && (
                <div>
                  <Rotulo>{t('auth.signup.address')}</Rotulo>
                  <cadastro.Field name="cep">
                    {(f) => (
                      <>
                        <input id="cep" data-cy="cep" inputMode="numeric" placeholder={t('auth.signup.cepPlaceholder')} value={f.state.value}
                          onChange={(e) => { const m = mascaraCep(e.target.value); cepMut.reset(); f.handleChange(m); buscarCep(m); }}
                          onBlur={(e) => buscarCep(e.target.value)} style={{ ...inputEstilo, marginBottom: 8 }} />
                        {cepMut.isPending && <small style={{ color: 'var(--cinza-500)' }}>{t('auth.signup.cepSearching')}</small>}
                        {cepMut.isSuccess && !cepMut.data && <small style={{ color: 'var(--erro)' }}>{t('auth.signup.cepNotFound')}</small>}
                      </>
                    )}
                  </cadastro.Field>
                  <Leitura style={{ marginBottom: 8 }}><input data-cy="endereco-empresa" readOnly value={linhaLogradouro(dados, cepMut.data ?? null)} style={{ all: 'unset', width: '100%', font: '13.5px var(--font-body)', color: 'var(--text-title)' }} /></Leitura>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                    <cadastro.Field name="numero">{(f) => <div><Rotulo>{t('auth.signup.numero')}</Rotulo><input data-cy="numero" inputMode="numeric" placeholder={t('auth.signup.numeroPlaceholder')} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} style={inputEstilo} /></div>}</cadastro.Field>
                    <cadastro.Field name="complemento">{(f) => <div><Rotulo>{t('auth.signup.complemento')}</Rotulo><input data-cy="complemento" placeholder={t('auth.signup.complementoPlaceholder')} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} style={inputEstilo} /></div>}</cadastro.Field>
                  </div>
                </div>
              )}

              {dados.socios && dados.socios.length > 0 && (
                <div>
                  <Rotulo>{t('auth.signup.qsa')}</Rotulo>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dados.socios.map((s, i) => (
                      <li key={i} data-cy="socio" style={{ background: 'var(--azul-50)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                        <strong>{s.nome}</strong>
                        <span style={{ color: 'var(--cinza-500)' }}> — {s.qualificacao}{s.documento ? ` · ${s.documento}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contato editável (RN009) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <cadastro.Field name="nomeFantasia">{(f) => <div><Rotulo>{t('auth.signup.nomeFantasia')}</Rotulo><input data-cy="nome-fantasia" placeholder={t('auth.signup.nomeFantasiaPlaceholder')} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} style={inputEstilo} /></div>}</cadastro.Field>
                <cadastro.Field name="telefone">{(f) => <div><Rotulo>{t('auth.signup.telefone')}</Rotulo><input data-cy="telefone" inputMode="tel" placeholder={t('auth.signup.telefonePlaceholder')} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} style={inputEstilo} /></div>}</cadastro.Field>
              </div>

              {/* Credencial de login (UC001 passo 4) */}
              <cadastro.Field name="email">{(f) => <div><Rotulo>{t('auth.signup.email')}</Rotulo><input data-cy="email-cadastro" type="email" autoComplete="email" placeholder={t('auth.signup.emailPlaceholder')} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} style={inputEstilo} /></div>}</cadastro.Field>
              <cadastro.Field name="senha">{(f) => (
                <div>
                  <Rotulo>{t('auth.signup.senha')}</Rotulo>
                  <div style={{ position: 'relative' }}>
                    <input data-cy="senha-cadastro" type={verSenhaCad ? 'text' : 'password'} autoComplete="new-password" placeholder={t('auth.signup.senhaPlaceholder')} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} style={{ ...inputEstilo, paddingRight: 88 }} />
                    <button type="button" onClick={() => setVerSenhaCad((v) => !v)} aria-label={verSenhaCad ? t('auth.login.hideAria') : t('auth.login.showAria')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', font: '600 12.5px var(--font-body)', color: 'var(--azul-700)', padding: '6px 8px' }}>{verSenhaCad ? t('auth.login.hide') : t('auth.login.show')}</button>
                  </div>
                </div>
              )}</cadastro.Field>

              {/* Consentimento LGPD */}
              <button type="button" role="checkbox" aria-checked={consentido} data-cy="consentimento" onClick={() => setConsentido((v) => !v)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', font: '400 13px var(--font-body)', color: 'var(--cinza-700)' }}>
                <span aria-hidden style={{ flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5, border: `2px solid ${consentido ? 'var(--azul-700)' : 'var(--border)'}`, background: consentido ? 'var(--azul-700)' : '#fff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{consentido ? '✓' : ''}</span>
                <span>{t('auth.signup.consent')}</span>
              </button>
            </div>
          )}

          {indisponivel && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <a data-cy="preencher-manual" href="#manual" style={{ font: '500 13px var(--font-body)', color: 'var(--azul-700)', textDecoration: 'underline' }}>{t('auth.signup.manualLink')}</a>
            </div>
          )}

          {cadastroMut.isError && <p data-cy="cadastro-erro" style={{ color: 'var(--erro)', margin: '16px 0 0', fontSize: 13 }}>{t(chaveErroCadastro(cadastroMut.error))}</p>}
          <button data-cy="criar-conta" type="submit" className="btn btn-primary btn-block" style={{ marginTop: 24, padding: 13, fontSize: 15 }} disabled={!dados || !consentido || cadastroMut.isPending}>{cadastroMut.isPending ? t('auth.signup.submitting') : t('auth.signup.submit')}</button>
          {dados && <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12.5, color: 'var(--cinza-400)' }}><Trans i18nKey="auth.signup.statusNote" components={{ b: <strong style={{ color: 'var(--azul-700)' }} /> }} /></p>}
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void formLogin.handleSubmit(); }}>
          <h2 style={{ fontSize: 21, margin: '0 0 4px', letterSpacing: '-0.01em' }}>{t('auth.login.title')}</h2>
          <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--cinza-500)', lineHeight: 1.5 }}>{t('auth.login.subtitle')}</p>

          <formLogin.Field name="email">{(f) => <><label className="label" htmlFor="email" style={{ marginBottom: 7 }}>{t('auth.login.email')}</label><input id="email" data-cy="email" type="email" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder={t('auth.login.emailPlaceholder')} style={{ ...inputEstilo, marginBottom: 16 }} /></>}</formLogin.Field>

          <formLogin.Field name="senha">{(f) => (
            <>
              <label className="label" htmlFor="senha" style={{ marginBottom: 7 }}>{t('auth.login.password')}</label>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <input id="senha" data-cy="senha" type={verSenha ? 'text' : 'password'} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder={t('auth.login.passwordPlaceholder')} style={{ ...inputEstilo, paddingRight: 88 }} />
                <button
                  type="button"
                  onClick={() => setVerSenha((v) => !v)}
                  aria-label={verSenha ? t('auth.login.hideAria') : t('auth.login.showAria')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', font: '600 12.5px var(--font-body)', color: 'var(--azul-700)', padding: '6px 8px' }}
                >
                  {verSenha ? t('auth.login.hide') : t('auth.login.show')}
                </button>
              </div>
            </>
          )}</formLogin.Field>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button type="button" role="checkbox" aria-checked={manter} onClick={() => setManter((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: '500 13px var(--font-body)', color: 'var(--cinza-700)' }}>
              {t('auth.login.keep')}
            </button>
            <a href="#recuperar" style={{ font: '500 12.5px var(--font-body)', color: 'var(--azul-700)', textDecoration: 'none' }}>{t('auth.login.forgot')}</a>
          </div>

          {loginMut.isError && <p data-cy="login-erro" style={{ color: 'var(--erro)', marginBottom: 12, fontSize: 13 }}>{t('auth.login.error')}</p>}
          <button data-cy="entrar" type="submit" className="btn btn-primary btn-block" style={{ padding: 13, fontSize: 15 }} disabled={loginMut.isPending}>{loginMut.isPending ? t('auth.login.submitting') : t('auth.login.submit')}</button>
        </form>
      )}
    </>
  );
}
