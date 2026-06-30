import { useState } from 'react';
import { cores } from '../../design-system/tokens';

/**
 * AuthPanel (UX-DR2) — painel dividido: institucional + autenticação. Cadastro por CNPJ com
 * "Consultar" e fallback manual VISÍVEL quando a Receita cai. Paleta azul institucional.
 */
export function AuthPanel() {
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>
      <aside style={{ background: cores.azul900, color: cores.branco, padding: 48 }}>
        <strong>Compra Mais</strong> · Prefeitura de Rio Branco
        <h1>O comércio local conectado às compras da cidade.</h1>
        <ul>
          <li>Cadastro automático via Receita Federal</li>
          <li>Triagem antifraude em Dívida Ativa e SICAF</li>
          <li>Reuso de documentos entre editais</li>
        </ul>
        <small>Lei nº 14.133/2021 · Lei Municipal 2.027 · SMGA / CPL</small>
      </aside>
      <section style={{ padding: 48 }}>
        <h2>Cadastro de fornecedor</h2>
        <label htmlFor="cnpj">CNPJ da empresa</label>
        <input id="cnpj" data-cy="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
        <button data-cy="consultar" onClick={consultar} style={{ background: cores.azul700, color: cores.branco }}>Consultar</button>
        {dados?.razaoSocial && <input data-cy="razao-social" readOnly value={dados.razaoSocial} />}
        {indisponivel && (
          <a data-cy="preencher-manual" href="#manual">Receita Federal indisponível? Preencher manualmente</a>
        )}
        <button data-cy="criar-conta" style={{ background: cores.azul700, color: cores.branco }}>Criar conta de fornecedor</button>
      </section>
    </div>
  );
}
