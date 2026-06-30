import { useEffect, useState } from 'react';

/** Vitrine de editais (UX-DR3) — só compatíveis; estado vazio orientado. */
export function Editais() {
  const [editais, setEditais] = useState<Array<{ id: string; objeto: string }>>([]);
  useEffect(() => { fetch('/editais').then((r) => r.json()).then(setEditais); }, []);

  if (editais.length === 0) {
    return <p data-cy="estado-vazio">Nenhum edital compatível com seu ramo no momento. Avisaremos quando surgir.</p>;
  }
  return (
    <ul>
      {editais.map((e) => (
        <li key={e.id} data-cy="edital-item" data-compativel="true">{e.objeto}</li>
      ))}
    </ul>
  );
}
