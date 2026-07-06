import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, Botao } from '../../design-system/components';

/**
 * Painel do titular (Épico 7): pendências consolidadas (Query) + solicitação de direitos LGPD (Mutation).
 * Direitos exigem o próprio titular (§V) — o backend bloqueia procurador (403).
 */
export function PainelTitular({ fornecedorId }: { fornecedorId: string }) {
  const { t } = useTranslation();
  const { data: pendencias = [], isLoading: loadingPendencias } = useQuery({ queryKey: ['pendencias-consolidadas', fornecedorId], queryFn: () => api.pendenciasConsolidadas(fornecedorId) });
  const [tipo, setTipo] = useState<'acesso' | 'correcao' | 'exclusao'>('acesso');
  const solicitar = useMutation({ mutationFn: () => api.solicitarDireito(tipo) });

  return (
    <div className="stack">
      <div><h1 className="page-title">{t('painelTitular.titulo')}</h1><p className="page-sub">{t('painelTitular.subtitulo')}</p></div>

      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>{t('painelTitular.pendencias.titulo')}</h2>
        {loadingPendencias ? <p data-cy="carregando-pendencias">{t('painelTitular.pendencias.carregando')}</p> : pendencias.length === 0 && <p data-cy="sem-pendencias">{t('painelTitular.pendencias.vazio')}</p>}
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendencias.map((p, i) => (
            <li key={`${p.tipo}-${p.referenciaId ?? i}`} data-cy="pendencia" style={{ borderLeft: `3px solid var(--navy-700)`, paddingLeft: 12 }}>
              <strong>{p.tipo}</strong> — {p.motivo ?? '—'} <em>→ {p.proximoPasso}</em>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>{t('painelTitular.direitos.titulo')}</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select data-cy="tipo-direito" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="acesso">{t('painelTitular.direitos.acesso')}</option>
            <option value="correcao">{t('painelTitular.direitos.correcao')}</option>
            <option value="exclusao">{t('painelTitular.direitos.exclusao')}</option>
          </select>
          <Botao data-cy="solicitar-direito" onClick={() => solicitar.mutate()} disabled={solicitar.isPending}>{t('painelTitular.direitos.solicitar')}</Botao>
        </div>
        {solicitar.isSuccess && <p data-cy="direito-ok" style={{ color: 'var(--sucesso)' }}>{t('painelTitular.direitos.registrada')}</p>}
      </Card>
    </div>
  );
}
