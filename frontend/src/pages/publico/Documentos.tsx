import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, Pill } from '../../design-system/components';

/** Repositório documental (FR-007/008) — upload + lista com status vigente/expirado. Query. */
export function Documentos({ fornecedorId }: { fornecedorId: string }) {
  const { data: docs = [] } = useQuery({ queryKey: ['documentos', fornecedorId], queryFn: () => api.documentos(fornecedorId) });

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Documentos</h1>
        <p className="page-sub">Envie e acompanhe a vigência dos seus documentos — reutilizáveis entre editais.</p>
      </div>
      <Card>
        <input type="file" data-cy="upload" accept=".pdf,.jpg,.png" />
      </Card>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {docs.map((d) => (
          <li key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
            <span>{d.tipo}</span>
            <Pill tom={d.situacao === 'vigente' ? 'success' : 'error'}>{d.situacao}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}
