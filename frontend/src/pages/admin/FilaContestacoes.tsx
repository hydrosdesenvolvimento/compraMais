import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Botao } from '../../design-system/components';

/**
 * Fila de contestações de CNAE de um edital (US2 / Painel Admin). Query da lista; acatar (corrige) e
 * recusar (com motivo) via Mutations com invalidação. Recusar exige justificativa (FR-008/009).
 */
export function FilaContestacoes({ editalId }: { editalId: string }) {
  const [novoCnae, setNovoCnae] = useState('');
  const [motivo, setMotivo] = useState('');
  const qc = useQueryClient();
  const chave = ['contestacoes', editalId] as const;

  const { data: itens = [] } = useQuery({ queryKey: chave, queryFn: () => api.contestacoesDoEdital(editalId) });
  const invalidar = () => qc.invalidateQueries({ queryKey: chave });
  const acatar = useMutation({ mutationFn: (id: string) => api.acatarContestacao(id, novoCnae.split(',').map((c) => c.trim()).filter(Boolean)), onSuccess: () => { setNovoCnae(''); void invalidar(); } });
  const recusar = useMutation({ mutationFn: (id: string) => api.recusarContestacao(id, motivo), onSuccess: () => { setMotivo(''); void invalidar(); } });

  return (
    <div className="stack">
      <div><h1 className="page-title">Contestações de CNAE</h1><p className="page-sub">Acate (corrige o edital) ou recuse (com motivo) as contestações.</p></div>
      {itens.length === 0 && <p data-cy="sem-contestacoes">Sem contestações.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {itens.map((c) => (
          <li key={c.id} data-cy="contestacao" className="card">
            <div>{c.cnae} — <em style={{ color: 'var(--texto-suave)' }}>{c.situacao}</em> — {c.justificativa}</div>
            {c.situacao === 'pendente' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <input data-cy="novo-cnae" className="input" style={{ maxWidth: 200 }} placeholder="Novo(s) CNAE(s)" value={novoCnae} onChange={(e) => setNovoCnae(e.target.value)} />
                <Botao data-cy="acatar" onClick={() => acatar.mutate(c.id)}>Acatar</Botao>
                <input data-cy="motivo-recusa" className="input" style={{ maxWidth: 240 }} placeholder="Motivo (obrigatório p/ recusar)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                <Botao data-cy="recusar" variante="secundario" onClick={() => recusar.mutate(c.id)}>Recusar</Botao>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
