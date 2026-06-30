import { useEffect, useState } from 'react';
import { cores } from '../../design-system/tokens';

/** Dashboard administrativo — funil de pendentes (Épico 9 / US1). Reusa o Design System. */
interface Funil { documentosPendentes: number; editaisPorSituacao: { rascunho: number; publicado: number; encerrado: number }; bloqueiosAtivos: number }

export function Dashboard() {
  const [f, setF] = useState<Funil | null>(null);
  useEffect(() => { fetch('/admin/dashboard').then((r) => r.json()).then(setF); }, []);
  if (!f) return <p data-cy="carregando">Carregando…</p>;
  const Card = ({ titulo, valor }: { titulo: string; valor: number }) => (
    <div data-cy="card" style={{ border: `1px solid ${cores.azul700}`, borderRadius: 8, padding: 16, minWidth: 160 }}>
      <div style={{ fontSize: 28, color: cores.azul700 }}>{valor}</div><div>{titulo}</div>
    </div>
  );
  return (
    <main style={{ padding: 32 }}>
      <h1>Painel administrativo</h1>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card titulo="Documentos pendentes" valor={f.documentosPendentes} />
        <Card titulo="Editais publicados" valor={f.editaisPorSituacao.publicado} />
        <Card titulo="Editais em rascunho" valor={f.editaisPorSituacao.rascunho} />
        <Card titulo="Bloqueios ativos" valor={f.bloqueiosAtivos} />
      </div>
    </main>
  );
}
