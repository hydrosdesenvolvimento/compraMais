import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';

/**
 * Painel do titular (Épico 7): pendências consolidadas (Query) + solicitação de direitos LGPD (Mutation).
 * Direitos exigem o próprio titular (§V) — o backend bloqueia procurador (403).
 */
export function PainelTitular({ fornecedorId }: { fornecedorId: string }) {
  const { data: pendencias = [], isLoading: loadingPendencias } = useQuery({ queryKey: ['pendencias-consolidadas', fornecedorId], queryFn: () => api.pendenciasConsolidadas(fornecedorId) });
  const [tipo, setTipo] = useState<'acesso' | 'correcao' | 'exclusao'>('acesso');
  const solicitar = useMutation({ mutationFn: () => api.solicitarDireito(tipo) });

  return (
    <div className="stack">
      <div><h1 className="page-title">Meu painel</h1><p className="page-sub">Pendências consolidadas e seus direitos de titular (LGPD).</p></div>

      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Pendências</h2>
        {loadingPendencias ? <p data-cy="carregando-pendencias">Carregando…</p> : pendencias.length === 0 && <p data-cy="sem-pendencias">Nenhuma pendência.</p>}
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendencias.map((p) => (
            <li key={`${p.tipo}-${p.referenciaId ?? ''}`} data-cy="pendencia" style={{ borderLeft: `3px solid var(--navy-700)`, paddingLeft: 12 }}>
              <strong>{p.tipo}</strong> — {p.motivo ?? '—'} <em>→ {p.proximoPasso}</em>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Meus direitos (LGPD)</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select data-cy="tipo-direito" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="acesso">Acesso aos meus dados</option>
            <option value="correcao">Correção de dado</option>
            <option value="exclusao">Exclusão</option>
          </select>
          <Botao data-cy="solicitar-direito" onClick={() => solicitar.mutate()} disabled={solicitar.isPending}>Solicitar</Botao>
        </div>
        {solicitar.isSuccess && <p data-cy="direito-ok" style={{ color: 'var(--sucesso)' }}>Solicitação registrada.</p>}
      </Card>
    </div>
  );
}
