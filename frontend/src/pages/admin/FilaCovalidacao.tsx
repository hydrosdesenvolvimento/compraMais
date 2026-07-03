import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';

/**
 * Fila de covalidação da CPL (US1). Lista pendentes (Query, QBE por status/tipo) e aprova/reprova
 * (Mutation com invalidação). Reprovar exige justificativa (validação também no backend — FR-002).
 */
export function FilaCovalidacao({ fornecedorId }: { fornecedorId: string }) {
  const { t } = useTranslation();
  const [motivo, setMotivo] = useState('');
  const [status, setStatus] = useState<'pendente' | 'aprovado' | 'reprovado'>('pendente');
  const [tipo, setTipo] = useState('');
  const qc = useQueryClient();

  const { data: pendentes = [] } = useQuery({
    queryKey: ['docs-pendentes', fornecedorId, status, tipo],
    queryFn: () => { const qs = new URLSearchParams({ status }); if (tipo.trim()) qs.set('tipo', tipo.trim()); return api.docsPendentes(fornecedorId, qs); },
  });

  const decidir = useMutation({
    mutationFn: (v: { docId: string; resultado: 'aprovado' | 'reprovado' }) => api.covalidar(v.docId, { resultado: v.resultado, justificativa: motivo, empresaId: fornecedorId }),
    onSuccess: () => { setMotivo(''); void qc.invalidateQueries({ queryKey: ['docs-pendentes', fornecedorId] }); },
  });

  return (
    <div className="stack">
      <div><h1 className="page-title">{t('admin.covalidacao.titulo')}</h1><p className="page-sub">{t('admin.covalidacao.subtitulo')}</p></div>
      <Card>
        <div data-cy="filtros" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label>{t('admin.covalidacao.statusLabel')}
            <select data-cy="filtro-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="pendente">{t('admin.covalidacao.statusPendente')}</option><option value="aprovado">{t('admin.covalidacao.statusAprovado')}</option><option value="reprovado">{t('admin.covalidacao.statusReprovado')}</option>
            </select>
          </label>
          <input data-cy="filtro-tipo" placeholder={t('admin.covalidacao.tipoPlaceholder')} value={tipo} onChange={(e) => setTipo(e.target.value)} />
        </div>
      </Card>
      {pendentes.length === 0 && <p data-cy="vazio">{t('admin.covalidacao.vazio')}</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pendentes.map((d) => (
          <li key={d.id} data-cy="doc-pendente" className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ flex: 1 }}>{d.tipo}</strong>
            <Botao data-cy="aprovar" onClick={() => decidir.mutate({ docId: d.id, resultado: 'aprovado' })}>{t('admin.covalidacao.aprovar')}</Botao>
            <input data-cy="motivo" className="input" style={{ maxWidth: 240 }} placeholder={t('admin.covalidacao.motivoPlaceholder')} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <Botao data-cy="reprovar" variante="secundario" onClick={() => decidir.mutate({ docId: d.id, resultado: 'reprovado' })} disabled={!motivo.trim() || decidir.isPending}>{t('admin.covalidacao.reprovar')}</Botao>
          </li>
        ))}
      </ul>
    </div>
  );
}
