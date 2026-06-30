import { useEffect, useState } from 'react';
import { cores } from '../../design-system/tokens';

/** Repositório documental (FR-007/008) — upload + lista com status vigente/expirado. */
export function Documentos({ fornecedorId }: { fornecedorId: string }) {
  const [docs, setDocs] = useState<Array<{ id: string; tipo: string; situacao: 'vigente' | 'expirado' }>>([]);
  useEffect(() => { fetch(`/fornecedores/${fornecedorId}/documentos`).then((r) => r.json()).then(setDocs); }, [fornecedorId]);

  return (
    <main style={{ padding: 32 }}>
      <h1>Documentos</h1>
      <input type="file" data-cy="upload" accept=".pdf,.jpg,.png" />
      <ul>
        {docs.map((d) => (
          <li key={d.id}>
            {d.tipo} —{' '}
            <span style={{ color: d.situacao === 'vigente' ? cores.azul700 : cores.erro }}>{d.situacao}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
