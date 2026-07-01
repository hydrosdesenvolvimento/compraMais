import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, HttpError } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';

interface Filtros { usuario: string; evento: string; de: string; ate: string; editalId: string }
const VAZIO: Filtros = { usuario: '', evento: '', de: '', ate: '', editalId: '' };

function paramsDe(f: Filtros): URLSearchParams {
  const p = new URLSearchParams();
  if (f.usuario) p.set('usuario', f.usuario);
  if (f.evento) p.set('evento', f.evento);
  if (f.de) p.set('de', f.de);
  if (f.ate) p.set('ate', f.ate);
  if (f.editalId) p.set('editalId', f.editalId);
  return p;
}

/**
 * Consulta/exportação da trilha de auditoria (Painel de controle). Query com filtros aplicados (QBE);
 * 400 = intervalo inválido, 403 = sem permissão. Exportação CSV/JSON por download. Somente leitura.
 */
export function ConsultaAuditoria() {
  const [filtros, setFiltros] = useState<Filtros>(VAZIO);
  const [aplicado, setAplicado] = useState<Filtros>(VAZIO);
  const set = (k: keyof Filtros, v: string) => setFiltros((f) => ({ ...f, [k]: v }));

  const { data: registros = [], error } = useQuery({ queryKey: ['auditoria', aplicado], queryFn: () => api.auditoria(paramsDe(aplicado)), retry: false });
  const erro = error instanceof HttpError
    ? (error.status === 400 ? 'Intervalo de datas inválido (de > até).' : error.status === 403 ? 'Acesso restrito a perfis de controle/auditoria.' : 'Erro ao consultar.')
    : null;

  function exportar(formato: 'csv' | 'json') {
    const p = paramsDe(aplicado); p.set('formato', formato);
    window.location.href = `/auditoria/exportar?${p.toString()}`;
  }

  return (
    <div className="stack">
      <div><h1 className="page-title">Auditoria — trilha</h1><p className="page-sub">Consulta e exportação da trilha append-only (somente leitura).</p></div>
      <Card>
        <div data-cy="filtros" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input data-cy="usuario" className="input" style={{ maxWidth: 160 }} placeholder="Usuário/ator" value={filtros.usuario} onChange={(e) => set('usuario', e.target.value)} />
          <input data-cy="evento" className="input" style={{ maxWidth: 180 }} placeholder="Ação/evento" value={filtros.evento} onChange={(e) => set('evento', e.target.value)} />
          <input data-cy="de" className="input" style={{ maxWidth: 150 }} type="date" value={filtros.de} onChange={(e) => set('de', e.target.value)} />
          <input data-cy="ate" className="input" style={{ maxWidth: 150 }} type="date" value={filtros.ate} onChange={(e) => set('ate', e.target.value)} />
          <input data-cy="edital" className="input" style={{ maxWidth: 150 }} placeholder="Edital" value={filtros.editalId} onChange={(e) => set('editalId', e.target.value)} />
          <Botao data-cy="consultar" onClick={() => setAplicado({ ...filtros })}>Consultar</Botao>
          <Botao data-cy="exportar-csv" variante="secundario" onClick={() => exportar('csv')}>Exportar CSV</Botao>
          <Botao data-cy="exportar-json" variante="secundario" onClick={() => exportar('json')}>Exportar JSON</Botao>
        </div>
      </Card>
      {erro && <p data-cy="erro" role="alert" style={{ color: 'var(--erro)' }}>{erro}</p>}
      <Card>
        <table data-cy="trilha">
          <thead><tr><th>Quando</th><th>Ator</th><th>Ação</th><th>IP</th></tr></thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} data-cy="registro"><td>{r.timestamp}</td><td>{r.usuario ?? '—'}</td><td>{r.evento}</td><td>{r.ip ?? '—'}</td></tr>
            ))}
          </tbody>
        </table>
        {registros.length === 0 && !erro && <p data-cy="vazio">Nenhum registro para os filtros atuais.</p>}
      </Card>
    </div>
  );
}
