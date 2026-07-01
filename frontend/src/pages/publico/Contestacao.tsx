import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

/** Contestação/regularização (US3 / FR-012) — pendências num só lugar, com próximo passo. Query. */
export function Contestacao({ fornecedorId }: { fornecedorId: string }) {
  const { data: pendencias = [], isLoading } = useQuery({ queryKey: ['pendencias', fornecedorId], queryFn: () => api.pendencias(fornecedorId) });

  if (isLoading) return <p data-cy="carregando">Carregando…</p>;
  if (pendencias.length === 0) return <p data-cy="sem-pendencias">Nenhuma pendência. Tudo certo!</p>;
  return (
    <div className="stack">
      <div><h1 className="page-title">Meus credenciamentos</h1><p className="page-sub">Pendências e próximos passos para regularizar seu credenciamento.</p></div>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendencias.map((p, i) => (
          <li key={i} data-cy="pendencia" className="card" style={{ borderLeft: `3px solid var(--erro)` }}>
            <strong>{p.tipo}</strong> — {p.motivo ?? '—'}
            <div style={{ color: 'var(--navy-700)', marginTop: 4 }}>{p.proximoPasso}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
