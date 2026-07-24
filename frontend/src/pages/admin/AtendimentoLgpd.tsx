import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, HttpError } from '../../lib/api';
import { Botao } from '../../design-system/components';

/**
 * Fila de atendimento LGPD do Encarregado (DPO) / Administrador (UC017, fluxo passo 2). Lista os pedidos
 * PENDENTES do titular e permite atender (com resposta), recusar (com justificativa — RN003) ou, para
 * exclusão, descartar respeitando a retenção legal (FR-008: 409 quando ainda retido). A CPL não atende
 * (RNF007) — o backend responde 403 a papéis que não sejam dpo/administrador.
 */
export function AtendimentoLgpd() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const chave = ['lgpd-pendentes'] as const;
  const [resposta, setResposta] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  const { data: itens = [], isLoading } = useQuery({ queryKey: chave, queryFn: () => api.solicitacoesLgpd('pendente') });
  const invalidar = () => qc.invalidateQueries({ queryKey: chave });
  const ok = (texto: string) => { setFeedback({ tom: 'ok', texto }); void invalidar(); };

  const atender = useMutation({
    meta: { semToast: true }, // esta tela já dá feedback inline — evita toast duplicado
    mutationFn: ({ id, r }: { id: string; r: string }) => api.atenderSolicitacao(id, r || t('adminLgpd.atendidaPadrao')),
    onSuccess: () => ok(t('adminLgpd.feedback.atendida')),
    onError: () => setFeedback({ tom: 'erro', texto: t('adminLgpd.feedback.erro') }),
  });
  const recusar = useMutation({
    meta: { semToast: true }, // idem: feedback inline
    mutationFn: ({ id, m }: { id: string; m: string }) => api.recusarSolicitacao(id, m),
    onSuccess: () => ok(t('adminLgpd.feedback.recusada')),
    onError: () => setFeedback({ tom: 'erro', texto: t('adminLgpd.feedback.erro') }),
  });
  const descartar = useMutation({
    meta: { semToast: true }, // idem: trata 409 (retido) inline com mensagem específica
    mutationFn: (id: string) => api.descartarSolicitacao(id, new Date().toISOString()),
    onSuccess: () => ok(t('adminLgpd.feedback.descartada')),
    // 409 = retido pela política de retenção legal (FR-008).
    onError: (e) => setFeedback({ tom: 'erro', texto: e instanceof HttpError && e.status === 409 ? t('adminLgpd.feedback.retido') : t('adminLgpd.feedback.erro') }),
  });
  const ocupado = atender.isPending || recusar.isPending || descartar.isPending;

  return (
    <div className="stack">
      <div><h1 className="page-title">{t('adminLgpd.titulo')}</h1></div>

      {feedback && (
        <div data-cy="lgpd-feedback" role="status" className={`pill ${feedback.tom === 'ok' ? 'pill-success' : 'pill-error'}`} style={{ display: 'inline-flex' }}>
          {feedback.texto}
        </div>
      )}

      {isLoading ? <p data-cy="lgpd-carregando">{t('adminLgpd.carregando')}</p>
        : itens.length === 0 && <p data-cy="lgpd-fila-vazia">{t('adminLgpd.vazio')}</p>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {itens.map((s) => (
          <li key={s.id} data-cy="lgpd-item" data-tipo={s.tipo} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong>{t(`privacidade.tipos.${s.tipo}`)}</strong>
              <span style={{ fontSize: 12.5, color: 'var(--cinza-500)' }}>{t('adminLgpd.titular')}: {s.titularId}</span>
            </div>
            {s.detalhe && <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{s.detalhe}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                data-cy="lgpd-resposta" className="input" style={{ maxWidth: 240 }}
                placeholder={t('adminLgpd.respostaPlaceholder')} value={resposta[s.id] ?? ''}
                onChange={(e) => setResposta((r) => ({ ...r, [s.id]: e.target.value }))}
              />
              <Botao data-cy="lgpd-atender" onClick={() => atender.mutate({ id: s.id, r: resposta[s.id] ?? '' })} disabled={ocupado}>
                {t('adminLgpd.atender')}
              </Botao>
              {s.tipo === 'exclusao' && (
                <Botao data-cy="lgpd-descartar" variante="amber" onClick={() => descartar.mutate(s.id)} disabled={ocupado}>
                  {t('adminLgpd.descartar')}
                </Botao>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                data-cy="lgpd-motivo" className="input" style={{ maxWidth: 240 }}
                placeholder={t('adminLgpd.motivoPlaceholder')} value={motivo[s.id] ?? ''}
                onChange={(e) => setMotivo((m) => ({ ...m, [s.id]: e.target.value }))}
              />
              <Botao data-cy="lgpd-recusar" variante="secundario" onClick={() => recusar.mutate({ id: s.id, m: motivo[s.id] ?? '' })} disabled={ocupado || !(motivo[s.id] ?? '').trim()}>
                {t('adminLgpd.recusar')}
              </Botao>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
