import { useState } from 'react';
import { Botao } from '../../design-system/components';

/**
 * AuthPanel (UX-DR2) — conteúdo do formulário (entra dentro do AuthLayout). Abas Entrar/Criar conta;
 * cadastro por CNPJ com "Consultar" e fallback manual VISÍVEL quando a Receita cai.
 */
export function AuthPanel() {
  const [aba, setAba] = useState<'entrar' | 'criar'>('criar');
  const [cnpj, setCnpj] = useState('');
  const [indisponivel, setIndisponivel] = useState(false);
  const [dados, setDados] = useState<{ razaoSocial?: string } | null>(null);

  async function consultar() {
    const res = await fetch('/fornecedores/consulta-cnpj', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cnpj }),
    });
    if (res.status === 503) { setIndisponivel(true); return; }
    setDados(await res.json());
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
            <input id="cnpj" data-cy="cnpj" className="input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="12.345.678/0001-90" />
            <Botao data-cy="consultar" onClick={consultar}>Consultar</Botao>
          </div>
          {dados?.razaoSocial && (
            <div style={{ marginTop: 14 }}>
              <label className="label">Razão social</label>
              <input data-cy="razao-social" className="input" readOnly value={dados.razaoSocial} />
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
