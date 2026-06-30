import { useEffect, useState } from 'react';
import { cores } from '../../design-system/tokens';

/** Contestação/regularização (US3 / FR-012) — pendências num só lugar, com próximo passo. */
interface Pendencia { tipo: string; motivo: string | null; proximoPasso: string; documentoId?: string; bloqueioId?: string }

export function Contestacao({ fornecedorId }: { fornecedorId: string }) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  useEffect(() => { fetch(`/fornecedores/${fornecedorId}/pendencias`).then((r) => r.json()).then(setPendencias); }, [fornecedorId]);

  if (pendencias.length === 0) return <p data-cy="sem-pendencias">Nenhuma pendência. Tudo certo!</p>;
  return (
    <main style={{ padding: 32 }}>
      <h1>Minhas pendências</h1>
      <ul>
        {pendencias.map((p, i) => (
          <li key={i} data-cy="pendencia" style={{ borderLeft: `3px solid ${cores.erro}`, paddingLeft: 12 }}>
            <strong>{p.tipo}</strong> — {p.motivo ?? '—'}
            <div style={{ color: cores.azul700 }}>{p.proximoPasso}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
