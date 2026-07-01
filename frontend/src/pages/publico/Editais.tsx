import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

/** Vitrine de editais (UX-DR3) — só compatíveis; estado vazio orientado. Dados via TanStack Query. */
export function Editais() {
  const { data: editais = [], isLoading } = useQuery({ queryKey: ['editais'], queryFn: api.editaisCompativeis });

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Editais compatíveis</h1>
        <p className="page-sub">Vitrine filtrada pelo seu ramo de atuação (CNAE).</p>
      </div>
      {isLoading ? (
        <p data-cy="carregando">Carregando…</p>
      ) : editais.length === 0 ? (
        <p data-cy="estado-vazio">Nenhum edital compatível com seu ramo no momento. Avisaremos quando surgir.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {editais.map((e) => (
            <li key={e.id} data-cy="edital-item" data-compativel="true" className="card" style={{ padding: '14px 18px' }}>{e.objeto}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
