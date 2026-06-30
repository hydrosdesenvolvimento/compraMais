import { useEffect, useState } from 'react';

/**
 * Fila de contestações de CNAE de um edital (US2 / Painel Admin). Secretaria/CPL acata (corrige) ou
 * recusa (com motivo). Acatar reavalia a vitrine; recusar exige justificativa (FR-008/009).
 */
interface ContestacaoView { id: string; cnae: string; justificativa: string; situacao: string; motivoResolucao: string | null }

export function FilaContestacoes({ editalId }: { editalId: string }) {
  const [itens, setItens] = useState<ContestacaoView[]>([]);
  const [novoCnae, setNovoCnae] = useState('');
  const [motivo, setMotivo] = useState('');

  async function carregar() {
    const r = await fetch(`/editais/${editalId}/contestacoes-cnae`);
    setItens(await r.json());
  }
  useEffect(() => { void carregar(); }, [editalId]);

  async function acatar(id: string) {
    await fetch(`/contestacoes-cnae/${id}/acatar`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ novoCnaes: novoCnae.split(',').map((c) => c.trim()).filter(Boolean) }),
    });
    setNovoCnae(''); await carregar();
  }
  async function recusar(id: string) {
    await fetch(`/contestacoes-cnae/${id}/recusar`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ motivo }),
    });
    setMotivo(''); await carregar();
  }

  return (
    <section style={{ padding: 24 }}>
      <h2>Contestações de CNAE</h2>
      {itens.length === 0 && <p data-cy="sem-contestacoes">Sem contestações.</p>}
      <ul>
        {itens.map((c) => (
          <li key={c.id} data-cy="contestacao">
            {c.cnae} — <em>{c.situacao}</em> — {c.justificativa}
            {c.situacao === 'pendente' && (
              <span>
                <input data-cy="novo-cnae" placeholder="Novo(s) CNAE(s)" value={novoCnae} onChange={(e) => setNovoCnae(e.target.value)} />
                <button data-cy="acatar" onClick={() => acatar(c.id)}>Acatar</button>
                <input data-cy="motivo-recusa" placeholder="Motivo (obrigatório p/ recusar)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <button data-cy="recusar" onClick={() => recusar(c.id)}>Recusar</button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
