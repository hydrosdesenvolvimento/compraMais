import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Botao, Campo } from '../../design-system/components';
import { consultarCnpj, consultarCep, mascaraCnpj, mascaraCep } from '../../lib/br';

/**
 * AuthPanel (UX-DR2) — formulário do AuthLayout. Abas Entrar/Criar conta (TanStack Form).
 * Cadastro por CNPJ (Query mutation): autofill de razão social, porte, situação e QSA (sócios),
 * com autofill de endereço por CEP; fallback manual VISÍVEL quando a Receita cai.
 */
export function AuthPanel() {
  const [aba, setAba] = useState<'entrar' | 'criar'>('criar');
  const cnpjMut = useMutation({ mutationFn: (cnpj: string) => consultarCnpj(cnpj) });
  const cepMut = useMutation({ mutationFn: (cep: string) => consultarCep(cep) });
  const dados = cnpjMut.data ?? null;
  const indisponivel = (cnpjMut.isSuccess && !cnpjMut.data) || cnpjMut.isError;

  const cadastro = useForm({ defaultValues: { cnpj: '', cep: '' }, onSubmit: async () => { /* criar conta — próxima fase */ } });
  const login = useForm({ defaultValues: { email: '', senha: '' }, onSubmit: async () => { /* POST /auth/login — próxima fase */ } });

  function buscarCep(valor: string) {
    if (valor.replace(/\D/g, '').length === 8) cepMut.mutate(valor);
  }

  return (
    <>
      <div className="auth-tabs" role="tablist">
        <button data-cy="aba-entrar" className={`auth-tab ${aba === 'entrar' ? 'active' : ''}`} onClick={() => setAba('entrar')}>Entrar</button>
        <button data-cy="aba-criar" className={`auth-tab ${aba === 'criar' ? 'active' : ''}`} onClick={() => setAba('criar')}>Criar conta</button>
      </div>

      {aba === 'criar' ? (
        <form onSubmit={(e) => { e.preventDefault(); void cadastro.handleSubmit(); }}>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>Cadastro de fornecedor</h2>
          <p style={{ color: 'var(--texto-suave)', margin: '0 0 22px' }}>Informe o CNPJ da empresa. Os dados são validados na Receita Federal automaticamente.</p>

          <cadastro.Field name="cnpj">
            {(f) => (
              <>
                <label className="label" htmlFor="cnpj">CNPJ da empresa</label>
                <div className="cnpj-row">
                  <input id="cnpj" data-cy="cnpj" className="input" inputMode="numeric" value={f.state.value} onChange={(e) => { cnpjMut.reset(); f.handleChange(mascaraCnpj(e.target.value)); }} placeholder="12.345.678/0001-90" />
                  <Botao data-cy="consultar" type="button" onClick={() => cnpjMut.mutate(f.state.value)} disabled={cnpjMut.isPending}>Consultar</Botao>
              </>
            )}
          </cadastro.Field>

          {dados && (
            <div style={{ marginTop: 16 }}>
              <Campo label="Razão social"><input data-cy="razao-social" className="input" readOnly value={dados.razaoSocial} /></Campo>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Campo label="Porte"><input className="input" readOnly value={dados.porte} /></Campo>
                <Campo label="Situação"><input className="input" readOnly value={dados.situacaoCadastral} /></Campo>
              </div>

              {dados.socios && dados.socios.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <label className="label">Quadro societário (QSA)</label>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dados.socios.map((s, i) => (
                      <li key={i} data-cy="socio" style={{ background: 'var(--divisor)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                        <strong>{s.nome}</strong>
                        <span style={{ color: 'var(--texto-suave)' }}> — {s.qualificacao}{s.documento ? ` · ${s.documento}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <cadastro.Field name="cep">
                {(f) => (
                  <>
                    <label className="label" htmlFor="cep">CEP</label>
                    <input id="cep" data-cy="cep" className="input" inputMode="numeric" placeholder="00000-000" value={f.state.value}
                      onChange={(e) => { const m = mascaraCep(e.target.value); f.handleChange(m); buscarCep(m); }}
                      onBlur={(e) => buscarCep(e.target.value)} />
                    {cepMut.isPending && <small style={{ color: 'var(--texto-suave)' }}>Buscando endereço…</small>}
                    {cepMut.isSuccess && cepMut.data && <small data-cy="endereco" style={{ color: 'var(--sucesso)' }}>{cepMut.data.rua}, {cepMut.data.bairro} — {cepMut.data.cidade}/{cepMut.data.estado}</small>}
                    {cepMut.isSuccess && !cepMut.data && <small style={{ color: 'var(--erro)' }}>CEP não encontrado</small>}
                  </>
                )}
              </cadastro.Field>
            </div>
          )}

          {indisponivel && (
            <p style={{ marginTop: 14 }}>
              <a data-cy="preencher-manual" className="link-amber" href="#manual">Receita Federal indisponível? Preencher manualmente</a>
            </p>
          )}
          <Botao data-cy="criar-conta" variante="primario" className="btn-block" type="submit" style={{ marginTop: 24 }}>Criar conta de fornecedor</Botao>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void login.handleSubmit(); }}>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>Entrar</h2>
          <p style={{ color: 'var(--texto-suave)', margin: '0 0 22px' }}>Acesse com seu e-mail e senha.</p>
          <login.Field name="email">{(f) => <><label className="label" htmlFor="email">E-mail</label><input id="email" data-cy="email" className="input" type="email" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="voce@empresa.com" style={{ marginBottom: 14 }} /></>}</login.Field>
          <login.Field name="senha">{(f) => <><label className="label" htmlFor="senha">Senha</label><input id="senha" data-cy="senha" className="input" type="password" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="••••••••" /></>}</login.Field>
          <Botao data-cy="entrar" variante="primario" className="btn-block" type="submit" style={{ marginTop: 24 }}>Entrar</Botao>
        </form>
      )}
    </>
  );
}
