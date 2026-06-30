import { useState } from 'react';
import { cores } from '../../design-system/tokens';

/**
 * Contestação de CNAE pelo fornecedor (US2 / FR-007). Justificativa obrigatória.
 * Qualquer fornecedor cadastrado/ativo pode contestar (clarify Q3); a procedência é julgada pela Secretaria.
 */
export function ContestarCnae({ editalId }: { editalId: string }) {
  const [cnae, setCnae] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function enviar() {
    const r = await fetch(`/editais/${editalId}/contestacoes-cnae`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, // x-empresa-id vem da sessão
      body: JSON.stringify({ cnaeContestado: cnae, justificativa }),
    });
    setStatus(r.ok ? 'enviada' : 'erro');
  }

  return (
    <section style={{ padding: 24, borderLeft: `3px solid ${cores.azul700}` }}>
      <h2>Contestar enquadramento de CNAE</h2>
      <input data-cy="cnae" placeholder="CNAE" value={cnae} onChange={(e) => setCnae(e.target.value)} />
      <textarea data-cy="justificativa" placeholder="Justificativa (obrigatória)" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
      <button data-cy="enviar-contestacao" disabled={!justificativa.trim()} onClick={enviar}>Enviar contestação</button>
      {status === 'enviada' && <p data-cy="contestacao-ok">Contestação enviada — aguarde a análise da Secretaria.</p>}
    </section>
  );
}
