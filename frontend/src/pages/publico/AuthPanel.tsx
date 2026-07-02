import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { consultarCnpj, consultarCep, login, mascaraCnpj, mascaraCep, type DadosCnpj, type EnderecoCep } from '../../lib/br';
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
  const navigate = useNavigate();
  const [aba, setAba] = useState<'entrar' | 'criar'>('criar');
  const [verSenha, setVerSenha] = useState(false);
  const [manter, setManter] = useState(true);

  const cepMut = useMutation({ mutationFn: (cep: string) => consultarCep(cep) });

  const cadastro = useForm({
    defaultValues: { cnpj: '', cep: '', numero: '', complemento: '' },
    onSubmit: async () => { /* criar conta — próxima fase */ },
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

  const loginMut = useMutation({
    mutationFn: (v: { email: string; senha: string }) => login(v.email, v.senha),
    onSuccess: (r) => { salvarToken(r.token); void navigate({ to: '/inicio' }); },
  });
  const formLogin = useForm({ defaultValues: { email: '', senha: '' }, onSubmit: async ({ value }) => { await loginMut.mutateAsync(value).catch(() => { /* erro via loginMut.isError */ }); } });

  function buscarCep(valor: string) { if (valor.replace(/\D/g, '').length === 8) cepMut.mutate(valor); }

  return (
    <>
      <div className="auth-tabs" role="tablist">
        <button data-cy="aba-entrar" className={`auth-tab ${aba === 'entrar' ? 'active' : ''}`} onClick={() => setAba('entrar')}>Entrar</button>
        <button data-cy="aba-criar" className={`auth-tab ${aba === 'criar' ? 'active' : ''}`} onClick={() => setAba('criar')}>Criar conta</button>
      </div>

      {aba === 'criar' ? (
        <form onSubmit={(e) => { e.preventDefault(); void cadastro.handleSubmit(); }}>
          <h2 style={{ fontSize: 21, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Cadastro de fornecedor</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--cinza-500)', lineHeight: 1.5 }}>Informe o CNPJ da empresa. Os dados são validados na Receita Federal automaticamente.</p>

          <cadastro.Field name="cnpj">
            {(f) => (
              <>
                <label className="label" htmlFor="cnpj" style={{ marginBottom: 7 }}>CNPJ da empresa</label>
                <div style={{ position: 'relative', marginBottom: 4 }}>
                  <input id="cnpj" data-cy="cnpj" inputMode="numeric" value={f.state.value} placeholder="00.000.000/0000-00"
                    onChange={(e) => { cnpjMut.reset(); f.handleChange(mascaraCnpj(e.target.value)); }}
                    style={{ ...inputEstilo, paddingRight: 108 }} />
                  <button data-cy="consultar" type="button" onClick={() => cnpjMut.mutate(f.state.value)} disabled={cnpjMut.isPending}
                    style={{ position: 'absolute', right: 6, top: 6, bottom: 6, padding: '0 16px', border: 'none', borderRadius: 6, background: 'var(--azul-700)', color: '#fff', font: '600 13px var(--font-body)', cursor: 'pointer', opacity: cnpjMut.isPending ? 0.6 : 1 }}>Consultar</button>
                </div>
              </>
            )}
          </cadastro.Field>

          {cnpjMut.isPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, padding: '13px 15px', background: 'var(--azul-50)', borderRadius: 10, color: 'var(--azul-800)', fontSize: 14, fontWeight: 500 }}>
              <span style={{ width: 18, height: 18, border: '2.5px solid var(--azul-100)', borderTopColor: 'var(--azul-700)', borderRadius: '50%', display: 'inline-block', animation: 'cmspin .7s linear infinite' }} />
              Consultando dados na Receita Federal…
            </div>
          )}

          {dados && (
            <div style={{ marginTop: 18, display: 'grid', gap: 13, animation: 'cmfade .35s' }}>
              <div><Rotulo>RAZÃO SOCIAL</Rotulo><Leitura><input data-cy="razao-social" readOnly value={dados.razaoSocial} style={{ all: 'unset', width: '100%', font: '14px var(--font-body)', color: 'var(--text-title)' }} /></Leitura></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <div><Rotulo>PORTE</Rotulo><Leitura>{dados.porte}</Leitura></div>
                <div><Rotulo>SITUAÇÃO</Rotulo><Leitura>{dados.situacaoCadastral}</Leitura></div>
              </div>

              {(dados.endereco || cepMut.data) && (
                <div>
                  <Rotulo>ENDEREÇO</Rotulo>
                  <cadastro.Field name="cep">
                    {(f) => (
                      <>
                        <input id="cep" data-cy="cep" inputMode="numeric" placeholder="00000-000" value={f.state.value}
                          onChange={(e) => { const m = mascaraCep(e.target.value); cepMut.reset(); f.handleChange(m); buscarCep(m); }}
                          onBlur={(e) => buscarCep(e.target.value)} style={{ ...inputEstilo, marginBottom: 8 }} />
                        {cepMut.isPending && <small style={{ color: 'var(--cinza-500)' }}>Buscando endereço…</small>}
                        {cepMut.isSuccess && !cepMut.data && <small style={{ color: 'var(--erro)' }}>CEP não encontrado</small>}
                      </>
                    )}
                  </cadastro.Field>
                  <Leitura style={{ marginBottom: 8 }}><input data-cy="endereco-empresa" readOnly value={linhaLogradouro(dados, cepMut.data ?? null)} style={{ all: 'unset', width: '100%', font: '13.5px var(--font-body)', color: 'var(--text-title)' }} /></Leitura>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                    <cadastro.Field name="numero">{(f) => <div><Rotulo>NÚMERO</Rotulo><input data-cy="numero" inputMode="numeric" placeholder="Nº" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} style={inputEstilo} /></div>}</cadastro.Field>
                    <cadastro.Field name="complemento">{(f) => <div><Rotulo>COMPLEMENTO</Rotulo><input data-cy="complemento" placeholder="Sala, andar, bloco… (opcional)" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} style={inputEstilo} /></div>}</cadastro.Field>
                  </div>
                </div>
              )}

              {dados.socios && dados.socios.length > 0 && (
                <div>
                  <Rotulo>QUADRO SOCIETÁRIO (QSA)</Rotulo>
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
            </div>
          )}

          {indisponivel && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <a data-cy="preencher-manual" href="#manual" style={{ font: '500 13px var(--font-body)', color: 'var(--azul-700)', textDecoration: 'underline' }}>Receita Federal indisponível? Preencher manualmente</a>
            </div>
          )}

          <button data-cy="criar-conta" type="submit" className="btn btn-primary btn-block" style={{ marginTop: 24, padding: 13, fontSize: 15 }}>Criar conta de fornecedor</button>
          {dados && <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12.5, color: 'var(--cinza-400)' }}>Sua conta iniciará com o status <strong style={{ color: 'var(--azul-700)' }}>Requerente</strong>.</p>}
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void formLogin.handleSubmit(); }}>
          <h2 style={{ fontSize: 21, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Acessar plataforma</h2>
          <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--cinza-500)', lineHeight: 1.5 }}>Entre com o e-mail e a senha cadastrados.</p>

          <formLogin.Field name="email">{(f) => <><label className="label" htmlFor="email" style={{ marginBottom: 7 }}>E-mail</label><input id="email" data-cy="email" type="email" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="voce@empresa.com" style={{ ...inputEstilo, marginBottom: 16 }} /></>}</formLogin.Field>

          <formLogin.Field name="senha">{(f) => (
            <>
              <label className="label" htmlFor="senha" style={{ marginBottom: 7 }}>Senha</label>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <input id="senha" data-cy="senha" type={verSenha ? 'text' : 'password'} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="••••••••" style={{ ...inputEstilo, paddingRight: 88 }} />
                <button
                  type="button"
                  onClick={() => setVerSenha((v) => !v)}
                  aria-label={verSenha ? 'Ocultar senha' : 'Ver senha'}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', font: '600 12.5px var(--font-body)', color: 'var(--azul-700)', padding: '6px 8px' }}
                >
                  {verSenha ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </>
          )}</formLogin.Field>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <button type="button" role="checkbox" aria-checked={manter} onClick={() => setManter((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: '500 13px var(--font-body)', color: 'var(--cinza-700)' }}>
              Manter conectado
            </button>
            <a href="#recuperar" style={{ font: '500 12.5px var(--font-body)', color: 'var(--azul-700)', textDecoration: 'none' }}>Esqueci minha senha</a>
          </div>

          {loginMut.isError && <p data-cy="login-erro" style={{ color: 'var(--erro)', marginBottom: 12, fontSize: 13 }}>Credenciais inválidas.</p>}
          <button data-cy="entrar" type="submit" className="btn btn-primary btn-block" style={{ padding: 13, fontSize: 15 }} disabled={loginMut.isPending}>{loginMut.isPending ? 'Entrando…' : 'Entrar'}</button>
        </form>
      )}
    </>
  );
}
