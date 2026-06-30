import { useEffect, useState } from 'react';
import { cores } from '../../design-system/tokens';

/** Portal público de transparência (Épico 9 / US2). Sem login; só agregados públicos (§VI). */
interface Publico { editaisVigentes: number; secretarias: string[]; segmentos: string[] }

export function Transparencia() {
  const [d, setD] = useState<Publico | null>(null);
  useEffect(() => { fetch('/transparencia').then((r) => r.json()).then(setD); }, []);
  if (!d) return <p data-cy="carregando">Carregando…</p>;
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ color: cores.azul700 }}>Transparência — Compra Mais</h1>
      <p data-cy="editais-vigentes"><strong>{d.editaisVigentes}</strong> editais vigentes</p>
      <h2>Secretarias atendidas</h2>
      <ul>{d.secretarias.map((s) => <li key={s} data-cy="secretaria">{s}</li>)}</ul>
      <h2>Segmentos (CNAE) atendidos</h2>
      <ul>{d.segmentos.map((s) => <li key={s} data-cy="segmento">{s}</li>)}</ul>
    </main>
  );
}
