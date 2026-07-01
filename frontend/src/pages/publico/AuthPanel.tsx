import { useState } from 'react';
import { Botao, Campo } from '../../design-system/components';
import { consultarCnpj, consultarCep, mascaraCnpj, mascaraCep, type DadosCnpj } from '../../lib/br';

/**
 * AuthPanel (UX-DR2) — conteúdo do formulário (dentro do AuthLayout). Abas Entrar/Criar conta.
 * Cadastro por CNPJ (BrasilAPI): autofill de razão social, porte, situação e QSA (sócios), com
 * autofill de endereço por CEP; fallback manual VISÍVEL quando a Receita cai.
 */
export function AuthPanel() {
  const [aba, setAba] = useState<'entrar' | 'criar'>('criar');
  const [cnpj, setCnpj] = useState('');
  const [indisponivel, setIndisponivel] = useState(false);
  const [dados, setDados] = useState<DadosCnpj | null>(null);

  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState({ rua: '', bairro: '', cidade: '', uf: '' });
  const [cepStatus, setCepStatus] = useState<'idle' | 'buscando' | 'ok' | 'erro'>('idle');

  async function consultar() {
    setIndisponivel(false);
    const d = await consultarCnpj(cnpj);
    if (!d) { setIndisponivel(true); setDados(null); return; }
    setDados(d);
  }

  async function buscarCep(valor: string) {
    if (valor.replace(/\D/g, '').length !== 8) return;
    setCepStatus('buscando');
    try {
      const e = await consultarCep(valor);
      if (e) { setEndereco({ rua: e.rua, bairro: e.bairro, cidade: e.cidade, uf: e.estado }); setCepStatus('ok'); }
      else setCepStatus('erro');
    } catch { setCepStatus('erro'); }
  }

  return (
    <>
      <div className="auth-tabs" role="tablist">
        <button data-cy="aba-entrar" className={`auth-tab ${aba === 'entrar' ? 'active' : ''}`} onClick={() => setAba('entrar')}>Entrar</button>
        <button data-cy="aba-criar" className={`auth-tab ${aba === 'criar' ? 'active' : ''}`} onClick={() => setAba('criar')}>Criar conta</button>
      </div>

      {aba === 'criar' ? (
        <>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>Cadastro de fornecedor</h2>
          <p style={{ color: 'var(--texto-suave)', margin: '0 0 22px' }}>Informe o CNPJ da empresa. Os dados são validados na Receita Federal automaticamente.</p>
          <label className="label" htmlFor="cnpj">CNPJ da empresa</label>
          <div className="cnpj-row">
            <input id="cnpj" data-cy="cnpj" className="input" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(mascaraCnpj(e.target.value))} placeholder="12.345.678/0001-90" />
            <Botao data-cy="consultar" onClick={consultar}>Consultar</Botao>
          </div>

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

              <label className="label" htmlFor="cep">CEP</label>
              <input
                id="cep" data-cy="cep" className="input" inputMode="numeric" placeholder="00000-000" value={cep}
                onChange={(e) => { const m = mascaraCep(e.target.value); setCep(m); setCepStatus('idle'); if (m.replace(/\D/g, '').length === 8) void buscarCep(m); }}
                onBlur={(e) => void buscarCep(e.target.value)}
              />
              {cepStatus === 'buscando' && <small style={{ color: 'var(--texto-suave)' }}>Buscando endereço…</small>}
              {cepStatus === 'ok' && <small data-cy="endereco" style={{ color: 'var(--sucesso)' }}>{endereco.rua}, {endereco.bairro} — {endereco.cidade}/{endereco.uf}</small>}
              {cepStatus === 'erro' && <small style={{ color: 'var(--erro)' }}>CEP não encontrado</small>}
            </div>
          )}

          {indisponivel && (
            <p style={{ marginTop: 14 }}>
              <a data-cy="preencher-manual" className="link-amber" href="#manual">Receita Federal indisponível? Preencher manualmente</a>
            </p>
          )}
          <Botao data-cy="criar-conta" variante="primario" className="btn-block" style={{ marginTop: 24 }}>Criar conta de fornecedor</Botao>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 24, marginBottom: 6 }}>Entrar</h2>
          <p style={{ color: 'var(--texto-suave)', margin: '0 0 22px' }}>Acesse com seu e-mail e senha.</p>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" data-cy="email" className="input" type="email" placeholder="voce@empresa.com" style={{ marginBottom: 14 }} />
          <label className="label" htmlFor="senha">Senha</label>
          <input id="senha" data-cy="senha" className="input" type="password" placeholder="••••••••" />
          <Botao data-cy="entrar" variante="primario" className="btn-block" style={{ marginTop: 24 }}>Entrar</Botao>
        </>
      )}
    </>
  );
}
