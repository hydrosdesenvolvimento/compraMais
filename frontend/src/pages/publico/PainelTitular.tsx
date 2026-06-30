import { useEffect, useState } from 'react';
import { cores } from '../../design-system/tokens';

/**
 * Painel do titular (Épico 7): tela única de pendências consolidadas + solicitação de direitos LGPD.
 * Direitos exigem o próprio titular (§V) — o backend bloqueia procurador (403).
 */
interface Pendencia { tipo: string; referenciaId: string; motivo: string | null; proximoPasso: string }

export function PainelTitular({ fornecedorId }: { fornecedorId: string }) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [tipo, setTipo] = useState<'acesso' | 'correcao' | 'exclusao'>('acesso');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetch(`/fornecedores/${fornecedorId}/pendencias-consolidadas`).then((r) => r.json()).then(setPendencias);
  }, [fornecedorId]);

  async function solicitar() {
    const r = await fetch('/titular/solicitacoes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tipo }) });
    setOk(r.ok);
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Meu painel</h1>

      <section>
        <h2>Pendências</h2>
        {pendencias.length === 0 && <p data-cy="sem-pendencias">Nenhuma pendência.</p>}
        <ul>
          {pendencias.map((p) => (
            <li key={`${p.tipo}-${p.referenciaId}`} data-cy="pendencia" style={{ borderLeft: `3px solid ${cores.azul700}`, paddingLeft: 12 }}>
              <strong>{p.tipo}</strong> — {p.motivo ?? '—'} <em>→ {p.proximoPasso}</em>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Meus direitos (LGPD)</h2>
        <select data-cy="tipo-direito" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="acesso">Acesso aos meus dados</option>
          <option value="correcao">Correção de dado</option>
          <option value="exclusao">Exclusão</option>
        </select>
        <button data-cy="solicitar-direito" onClick={solicitar}>Solicitar</button>
        {ok && <p data-cy="direito-ok">Solicitação registrada.</p>}
      </section>
    </main>
  );
}
