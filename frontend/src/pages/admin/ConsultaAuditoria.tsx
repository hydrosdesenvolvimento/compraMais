import { useEffect, useState } from 'react';

/**
 * Consulta e exportação da trilha de auditoria (US1/US2 / Painel de controle). Filtros usuário/data/ação/
 * edital (QBE); exportação CSV/JSON do conjunto filtrado. Somente leitura — não altera a trilha.
 */
interface Registro { id: string; usuario: string | null; evento: string; timestamp: string; ip: string | null }

export function ConsultaAuditoria() {
  const [usuario, setUsuario] = useState('');
  const [evento, setEvento] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [editalId, setEditalId] = useState('');
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  function qs() {
    const p = new URLSearchParams();
    if (usuario) p.set('usuario', usuario);
    if (evento) p.set('evento', evento);
    if (de) p.set('de', de);
    if (ate) p.set('ate', ate);
    if (editalId) p.set('editalId', editalId);
    return p.toString();
  }

  async function consultar() {
    setErro(null);
    const r = await fetch(`/auditoria?${qs()}`);
    if (r.status === 400) { setErro('Intervalo de datas inválido (de > até).'); setRegistros([]); return; }
    if (r.status === 403) { setErro('Acesso restrito a perfis de controle/auditoria.'); return; }
    setRegistros(await r.json());
  }
  useEffect(() => { void consultar(); }, []);

  function exportar(formato: 'csv' | 'json') {
    window.location.href = `/auditoria/exportar?formato=${formato}&${qs()}`; // download (Content-Disposition)
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Auditoria — consulta da trilha</h1>
      <section data-cy="filtros" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input data-cy="usuario" placeholder="Usuário/ator" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        <input data-cy="evento" placeholder="Ação/evento" value={evento} onChange={(e) => setEvento(e.target.value)} />
        <input data-cy="de" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        <input data-cy="ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        <input data-cy="edital" placeholder="Edital" value={editalId} onChange={(e) => setEditalId(e.target.value)} />
        <button data-cy="consultar" onClick={consultar}>Consultar</button>
        <button data-cy="exportar-csv" onClick={() => exportar('csv')}>Exportar CSV</button>
        <button data-cy="exportar-json" onClick={() => exportar('json')}>Exportar JSON</button>
      </section>
      {erro && <p data-cy="erro" role="alert">{erro}</p>}
      <table data-cy="trilha">
        <thead><tr><th>Quando</th><th>Ator</th><th>Ação</th><th>IP</th></tr></thead>
        <tbody>
          {registros.map((r) => (
            <tr key={r.id} data-cy="registro">
              <td>{r.timestamp}</td><td>{r.usuario ?? '—'}</td><td>{r.evento}</td><td>{r.ip ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {registros.length === 0 && !erro && <p data-cy="vazio">Nenhum registro para os filtros atuais.</p>}
    </main>
  );
}
