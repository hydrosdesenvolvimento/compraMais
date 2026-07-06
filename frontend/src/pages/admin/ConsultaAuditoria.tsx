import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [filtros, setFiltros] = useState<Filtros>(VAZIO);
  const [aplicado, setAplicado] = useState<Filtros>(VAZIO);
  const set = (k: keyof Filtros, v: string) => setFiltros((f) => ({ ...f, [k]: v }));

  const { data: registros = [], error } = useQuery({ queryKey: ['auditoria', aplicado], queryFn: () => api.auditoria(paramsDe(aplicado)), retry: false });
  const erro = error instanceof HttpError
    ? (error.status === 400 ? t('admin.auditoria.erroIntervalo') : error.status === 403 ? t('admin.auditoria.erroAcesso') : t('admin.auditoria.erroConsulta'))
    : null;

  function exportar(formato: 'csv' | 'json') {
    const p = paramsDe(aplicado); p.set('formato', formato);
    window.location.href = `/auditoria/exportar?${p.toString()}`;
  }

  return (
    <div className="stack">
      <div><h1 className="page-title">{t('admin.auditoria.titulo')}</h1><p className="page-sub">{t('admin.auditoria.subtitulo')}</p></div>
      <Card>
        <div data-cy="filtros" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input data-cy="usuario" className="input" style={{ maxWidth: 160 }} placeholder={t('admin.auditoria.usuarioPlaceholder')} value={filtros.usuario} onChange={(e) => set('usuario', e.target.value)} />
          <input data-cy="evento" className="input" style={{ maxWidth: 180 }} placeholder={t('admin.auditoria.eventoPlaceholder')} value={filtros.evento} onChange={(e) => set('evento', e.target.value)} />
          <input data-cy="de" className="input" style={{ maxWidth: 150 }} type="date" value={filtros.de} onChange={(e) => set('de', e.target.value)} />
          <input data-cy="ate" className="input" style={{ maxWidth: 150 }} type="date" value={filtros.ate} onChange={(e) => set('ate', e.target.value)} />
          <input data-cy="edital" className="input" style={{ maxWidth: 150 }} placeholder={t('admin.auditoria.editalPlaceholder')} value={filtros.editalId} onChange={(e) => set('editalId', e.target.value)} />
          <Botao data-cy="consultar" onClick={() => setAplicado({ ...filtros })}>{t('admin.auditoria.consultar')}</Botao>
          <Botao data-cy="exportar-csv" variante="secundario" onClick={() => exportar('csv')}>{t('admin.auditoria.exportarCsv')}</Botao>
          <Botao data-cy="exportar-json" variante="secundario" onClick={() => exportar('json')}>{t('admin.auditoria.exportarJson')}</Botao>
        </div>
      </Card>
      {erro && <p data-cy="erro" role="alert" style={{ color: 'var(--erro)' }}>{erro}</p>}
      <Card>
        <table data-cy="trilha">
          <thead><tr><th>{t('admin.auditoria.colQuando')}</th><th>{t('admin.auditoria.colAtor')}</th><th>{t('admin.auditoria.colAcao')}</th><th>{t('admin.auditoria.colIp')}</th></tr></thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} data-cy="registro"><td>{r.timestamp}</td><td>{r.usuario ?? '—'}</td><td>{r.evento}</td><td>{r.ip ?? '—'}</td></tr>
            ))}
          </tbody>
        </table>
        {registros.length === 0 && !erro && <p data-cy="vazio">{t('admin.auditoria.vazio')}</p>}
      </Card>
    </div>
  );
}
