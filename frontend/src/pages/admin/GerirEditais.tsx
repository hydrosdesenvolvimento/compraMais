import { useEffect, useState } from 'react';

/**
 * Gestão de editais (US1 / Painel Admin). Criar (rascunho), publicar, encerrar e consultar (QBE).
 * Invariante 1 Edital = 1 Demanda: uma secretaria por edital (validado no backend — FR-002).
 */
interface EditalView { id: string; objeto: string; secretariaId: string; situacao: string }

export function GerirEditais({ secretariaId }: { secretariaId: string }) {
  const [editais, setEditais] = useState<EditalView[]>([]);
  const [objeto, setObjeto] = useState('');
  const [cnae, setCnae] = useState('');
  const [quantitativos, setQuantitativos] = useState(1);
  const [prazo, setPrazo] = useState('');
  const [situacaoFiltro, setSituacaoFiltro] = useState('publicado');

  async function carregar() {
    const r = await fetch(`/gestao/editais?secretariaId=${secretariaId}&situacao=${situacaoFiltro}`);
    setEditais(await r.json());
  }
  useEffect(() => { void carregar(); }, [secretariaId, situacaoFiltro]);

  async function criar() {
    await fetch('/editais', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secretariaId, objeto, cnaesAlvo: cnae.split(',').map((c) => c.trim()).filter(Boolean), quantitativos, prazoVigencia: prazo }),
    });
    setObjeto(''); setCnae(''); setQuantitativos(1); setPrazo('');
    await carregar();
  }
  async function publicar(id: string) { await fetch(`/editais/${id}/publicar`, { method: 'POST' }); await carregar(); }
  async function encerrar(id: string) { await fetch(`/editais/${id}/encerrar`, { method: 'POST' }); await carregar(); }

  return (
    <main style={{ padding: 32 }}>
      <h1>Gestão de editais</h1>
      <section data-cy="form-edital" style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input data-cy="objeto" placeholder="Objeto da demanda" value={objeto} onChange={(e) => setObjeto(e.target.value)} />
        <input data-cy="cnae" placeholder="CNAE(s) alvo (vírgula)" value={cnae} onChange={(e) => setCnae(e.target.value)} />
        <input data-cy="quantitativos" type="number" min={1} value={quantitativos} onChange={(e) => setQuantitativos(Number(e.target.value))} />
        <input data-cy="prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        <button data-cy="criar" onClick={criar}>Criar edital (rascunho)</button>
      </section>

      <label>Filtrar situação
        <select data-cy="filtro-situacao" value={situacaoFiltro} onChange={(e) => setSituacaoFiltro(e.target.value)}>
          <option value="rascunho">Rascunho</option>
          <option value="publicado">Publicado</option>
          <option value="encerrado">Encerrado</option>
        </select>
      </label>
      <ul>
        {editais.map((e) => (
          <li key={e.id} data-cy="edital">
            {e.objeto} — <em>{e.situacao}</em>
            {e.situacao === 'rascunho' && <button data-cy="publicar" onClick={() => publicar(e.id)}>Publicar</button>}
            {e.situacao === 'publicado' && <button data-cy="encerrar" onClick={() => encerrar(e.id)}>Encerrar</button>}
          </li>
        ))}
      </ul>
    </main>
  );
}
