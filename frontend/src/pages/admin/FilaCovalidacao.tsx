import { useEffect, useState } from 'react';

/**
 * Fila de covalidação da CPL (US1 / UX Painel Admin). Visualiza pendentes, aprova/reprova.
 * Reprovar exige justificativa (validação também no backend — FR-002).
 */
export function FilaCovalidacao({ fornecedorId }: { fornecedorId: string }) {
  const [pendentes, setPendentes] = useState<Array<{ id: string; tipo: string }>>([]);
  const [motivo, setMotivo] = useState('');
  // Filtro QBE (FR-015): probe parcial de Documento — status/tipo viram query string.
  const [status, setStatus] = useState<'pendente' | 'aprovado' | 'reprovado'>('pendente');
  const [tipo, setTipo] = useState('');

  async function carregar() {
    const qs = new URLSearchParams({ status });
    if (tipo.trim()) qs.set('tipo', tipo.trim());
    const r = await fetch(`/fornecedores/${fornecedorId}/documentos/pendentes?${qs.toString()}`);
    setPendentes(await r.json());
  }
  useEffect(() => { void carregar(); }, [fornecedorId, status, tipo]);

  async function decidir(docId: string, resultado: 'aprovado' | 'reprovado') {
    await fetch(`/documentos/${docId}/covalidar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' }, // x-user-id / x-papel vêm da sessão
      body: JSON.stringify({ resultado, justificativa: motivo, empresaId: fornecedorId }),
    });
    setMotivo('');
    await carregar();
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Covalidação documental</h1>
      <div data-cy="filtros" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <label>
          Status
          <select data-cy="filtro-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="reprovado">Reprovado</option>
          </select>
        </label>
        <input data-cy="filtro-tipo" placeholder="Tipo (ex.: balanco)" value={tipo} onChange={(e) => setTipo(e.target.value)} />
      </div>
      {pendentes.length === 0 && <p data-cy="vazio">Nenhum documento para os filtros atuais.</p>}
      <ul>
        {pendentes.map((d) => (
          <li key={d.id} data-cy="doc-pendente">
            {d.tipo}
            <button data-cy="aprovar" onClick={() => decidir(d.id, 'aprovado')}>Aprovar</button>
            <input data-cy="motivo" placeholder="Motivo (obrigatório p/ reprovar)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <button data-cy="reprovar" onClick={() => decidir(d.id, 'reprovado')}>Reprovar</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
