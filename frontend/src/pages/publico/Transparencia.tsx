import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card } from '../../design-system/components';

/** Portal público de transparência (Épico 9 / US2). Sem login; só agregados públicos (§VI). */
export function Transparencia() {
  const { data, isLoading } = useQuery({ queryKey: ['transparencia'], queryFn: api.transparencia });
  if (isLoading || !data) return <p data-cy="carregando">Carregando…</p>;
  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Transparência</h1>
        <p className="page-sub">Demandas distribuídas e agregados públicos do programa Compra Mais.</p>
      </div>
      <Card>
        <p data-cy="editais-vigentes" style={{ margin: 0, fontSize: 18 }}><strong style={{ fontSize: 28, color: 'var(--navy-700)' }}>{data.editaisVigentes}</strong> editais vigentes</p>
      </Card>
      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Secretarias atendidas</h2>
        <ul>{data.secretarias.map((s) => <li key={s} data-cy="secretaria">{s}</li>)}</ul>
      </Card>
      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Segmentos (CNAE) atendidos</h2>
        <ul>{data.segmentos.map((s) => <li key={s} data-cy="segmento">{s}</li>)}</ul>
      </Card>
    </div>
  );
}
