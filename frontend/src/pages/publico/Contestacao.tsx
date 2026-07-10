import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type Pendencia } from '../../lib/api';
import { IconeBusca, IconeFiltro, IconeSeta } from '../../design-system/icons';

/**
 * Tela Única de Contestação / Regularização (UC016 / Épico 7-1). Consolida, como projeção somente-leitura,
 * as pendências do fornecedor (documento reprovado, bloqueio fiscal, contestação de CNAE, direito LGPD) e
 * delega cada ação ao módulo dono: reenviar documento → UC006; regularizar e reconsultar → UC002. As
 * pendências de análise (contestação de CNAE / LGPD) são informativas (aguardam a Secretaria/CPL ou o DPO).
 */
export function Contestacao({ fornecedorId }: { fornecedorId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  const { data: pendencias = [], isLoading } = useQuery({ queryKey: ['pendencias-consolidadas', fornecedorId], queryFn: () => api.pendenciasConsolidadas(fornecedorId) });
  // Necessário para a reconsulta de elegibilidade (UC002 exige o CNPJ na porta).
  const { data: perfil } = useQuery({ queryKey: ['fornecedor', fornecedorId], queryFn: () => api.fornecedor(fornecedorId) });

  const invalidar = () => { void qc.invalidateQueries({ queryKey: ['pendencias-consolidadas', fornecedorId] }); };

  const reenviar = useMutation({
    mutationFn: (docId: string) => api.reenviarDocumento(docId),
    onSuccess: () => { setFeedback({ tom: 'ok', texto: t('contestacao.acao.sucesso') }); invalidar(); },
    onError: () => setFeedback({ tom: 'erro', texto: t('contestacao.acao.erro') }),
  });
  const reconsultar = useMutation({
    mutationFn: () => api.reconsultarElegibilidade(fornecedorId, perfil?.cnpj ?? ''),
    onSuccess: () => { setFeedback({ tom: 'ok', texto: t('contestacao.acao.sucesso') }); invalidar(); },
    onError: () => setFeedback({ tom: 'erro', texto: t('contestacao.acao.erro') }),
  });

  const cabecalho = (
    <div style={{ marginBottom: 18 }}>
      <h1 className="cm-page-title">{t('contestacao.titulo')}</h1>
      <p className="cm-page-sub">{t('contestacao.subtitulo')}</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="stack">
        {cabecalho}
        <p data-cy="carregando" style={{ color: 'var(--cinza-500)' }}>{t('contestacao.carregando')}</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {cabecalho}

      {feedback && (
        <div
          data-cy="feedback-acao"
          role="status"
          className={`pill ${feedback.tom === 'ok' ? 'pill-success' : 'pill-error'}`}
          style={{ marginBottom: 14, display: 'inline-flex' }}
        >
          {feedback.texto}
        </div>
      )}

      {/* Busca + filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', color: 'var(--cinza-400)' }}>
            <IconeBusca width={17} height={17} />
          </span>
          <input
            className="input"
            aria-label={t('contestacao.busca.ariaLabel')}
            placeholder={t('contestacao.busca.placeholder')}
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>
        <button className="btn" type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <IconeFiltro width={16} height={16} />
          {t('contestacao.filtros')}
        </button>
      </div>

      {/* Lista */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xs)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho da lista */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid var(--divider)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{t('contestacao.exibindoPorPagina', { n: 10 })}</span>
          <span style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{t('contestacao.paginacao', { atual: 1, total: 1 })}</span>
        </div>

        {pendencias.length === 0 ? (
          <div data-cy="sem-pendencias" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
            <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 6 }}>
              {t('contestacao.vazio.titulo')}
            </div>
            <div style={{ fontSize: 13.5 }}>
              {t('contestacao.vazio.descricao')}
            </div>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pendencias.map((p, i) => (
              <li
                key={i}
                data-cy="pendencia"
                data-tipo={p.tipo}
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  padding: '16px 18px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)' }}>{rotuloTipo(p.tipo, t)}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--cinza-500)', marginTop: 3 }}>{p.motivo ?? '—'}</div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      fontSize: 13,
                      font: '600 13px var(--font-body)',
                      color: 'var(--azul-700)',
                    }}
                  >
                    <IconeSeta width={14} height={14} />
                    {p.proximoPasso}
                  </div>
                </div>
                <AcaoPendencia
                  pendencia={p}
                  onReenviar={(docId) => reenviar.mutate(docId)}
                  onReconsultar={() => reconsultar.mutate()}
                  ocupado={reenviar.isPending || reconsultar.isPending}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Rodapé com paginação */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderTop: '1px solid var(--divider)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--cinza-500)' }}>
            {t('contestacao.contagem', { count: pendencias.length })}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn"
              type="button"
              disabled
              style={{ minWidth: 36, padding: '6px 12px' }}
            >
              {t('contestacao.paginacao', { atual: 1, total: 1 })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Botão de ação da pendência — só documento (reenviar) e bloqueio (regularizar) são acionáveis daqui. */
function AcaoPendencia({
  pendencia, onReenviar, onReconsultar, ocupado,
}: {
  pendencia: Pendencia;
  onReenviar: (docId: string) => void;
  onReconsultar: () => void;
  ocupado: boolean;
}) {
  const { t } = useTranslation();
  if (pendencia.tipo === 'documento' && pendencia.referenciaId) {
    return (
      <button
        className="btn btn-primary"
        type="button"
        data-cy="acao-reenviar"
        disabled={ocupado}
        onClick={() => onReenviar(pendencia.referenciaId as string)}
        style={{ flexShrink: 0 }}
      >
        {ocupado ? t('contestacao.acao.processando') : t('contestacao.acao.reenviar')}
      </button>
    );
  }
  if (pendencia.tipo === 'bloqueio') {
    return (
      <button
        className="btn btn-primary"
        type="button"
        data-cy="acao-regularizar"
        disabled={ocupado}
        onClick={() => onReconsultar()}
        style={{ flexShrink: 0 }}
      >
        {ocupado ? t('contestacao.acao.processando') : t('contestacao.acao.regularizar')}
      </button>
    );
  }
  // contestação de CNAE / LGPD: aguardam análise da Secretaria/CPL ou do DPO — sem ação do fornecedor aqui.
  return <span className="pill pill-warn" style={{ flexShrink: 0 }} data-cy="acao-aguardando">{t('contestacao.acao.aguardando')}</span>;
}

function rotuloTipo(tipo: string, t: (k: string) => string): string {
  const chave = `contestacao.tipos.${tipo}`;
  const traduzido = t(chave);
  return traduzido === chave ? tipo : traduzido;
}
