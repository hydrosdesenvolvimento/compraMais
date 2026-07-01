import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

/** Dashboard administrativo — funil de pendentes (Épico 9 / US1). Dados via TanStack Query. */
export function Dashboard() {
  const { data: f, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.dashboardAdmin });
  if (isLoading || !f) return <p data-cy="carregando">Carregando…</p>;

  const CardKpi = ({ titulo, valor }: { titulo: string; valor: number }) => (
    <div data-cy="card" className="card" style={{ minWidth: 170 }}>
      <div style={{ fontSize: 30, color: 'var(--navy-700)', fontWeight: 700 }}>{valor}</div>
      <div style={{ color: 'var(--texto-suave)' }}>{titulo}</div>
    </div>
  );
  return (
    <div className="stack">
      <div><h1 className="page-title">Painel administrativo</h1><p className="page-sub">Funil de pendências da CPL / SMGA.</p></div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <CardKpi titulo="Documentos pendentes" valor={f.documentosPendentes} />
        <CardKpi titulo="Editais publicados" valor={f.editaisPorSituacao.publicado} />
        <CardKpi titulo="Editais em rascunho" valor={f.editaisPorSituacao.rascunho} />
        <CardKpi titulo="Bloqueios ativos" valor={f.bloqueiosAtivos} />
      </div>
    </div>
  );
}
