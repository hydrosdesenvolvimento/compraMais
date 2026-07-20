import { type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api, type CredenciamentoDetalheView } from '../../lib/api';
import { IconeVoltar } from '../../design-system/icons';

/** Cores do pill de situação — espelham `MeusCredenciamentos` (UC004). */
const ESTADOS: Record<CredenciamentoDetalheView['estado'], { bg: string; fg: string; dot: string }> = {
  iniciado: { bg: 'var(--atencao-bg)', fg: '#8A5410', dot: 'var(--atencao)' },
  aceito: { bg: 'var(--sucesso-bg)', fg: 'var(--sucesso)', dot: 'var(--sucesso)' },
  cancelado: { bg: 'var(--erro-bg)', fg: 'var(--erro-700)', dot: 'var(--erro)' },
};

const pill: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999,
  font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap',
};

/** DD/MM/AAAA · HH:MM no fuso do usuário — mesmo formato da lista. */
function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Detalhe read-only de um credenciamento (UC004) — destino da ação "Visualizar" da tela "Meus
 * Credenciamentos". O protótipo `spec/Prototipo/portal-fornecedor.html` prevê a ação para os
 * finalizados mas não desenha a tela; o layout segue o Design System (cartão de definições) e mostra o
 * que o domínio guarda: edital/objeto/secretaria, situação, capacidade declarada (RN005), etapa e o
 * Termo de Aceite (RN016). Sem edição — a saída é "Voltar".
 */
export function CredenciamentoDetalhe() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id?: string };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['credenciamento-detalhe', id],
    queryFn: () => api.detalharCredenciamento(id as string),
    enabled: !!id,
    retry: false,
  });

  const voltar = () => navigate({ to: '/credenciamentos' });

  const botaoVoltar = (
    <button
      type="button"
      data-cy="voltar"
      onClick={voltar}
      className="btn btn-ghost"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
    >
      <IconeVoltar width={16} height={16} />
      {t('credenciamentoDetalhe.voltar')}
    </button>
  );

  if (isLoading) {
    return <div className="stack" data-cy="credenciamento-detalhe"><p data-cy="carregando">{t('credenciamentoDetalhe.carregando')}</p></div>;
  }

  if (isError || !data) {
    return (
      <div className="stack" data-cy="credenciamento-detalhe">
        <div style={{ marginBottom: 16 }}>{botaoVoltar}</div>
        <div className="card" data-cy="nao-encontrado" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
          <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>
            {t('credenciamentoDetalhe.naoEncontrado')}
          </div>
          <div style={{ fontSize: 13.5 }}>{t('credenciamentoDetalhe.naoEncontradoDica')}</div>
        </div>
      </div>
    );
  }

  const meta = ESTADOS[data.estado];

  return (
    <div className="stack" data-cy="credenciamento-detalhe">
      <div style={{ marginBottom: 16 }}>{botaoVoltar}</div>

      <div className="cm-page-head" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="cm-page-title" style={{ fontSize: 22, color: 'var(--azul-900)', margin: 0 }}>
            {data.numeroEdital ?? t('credenciamentoDetalhe.titulo')}
          </h1>
          <p className="cm-page-sub" style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--cinza-500)' }}>
            {data.objeto ?? t('credenciamentoDetalhe.titulo')}
          </p>
        </div>
        <span data-cy="status" style={{ ...pill, background: meta.bg, color: meta.fg }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: meta.dot }} />
          {t(`meusCredenciamentos.estado.${data.estado}`)}
        </span>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 18 }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 220px) 1fr', rowGap: 14, columnGap: 16, margin: 0 }}>
          <Linha rotulo={t('credenciamentoDetalhe.edital')}>{data.numeroEdital ?? '—'}</Linha>
          <Linha rotulo={t('credenciamentoDetalhe.objeto')}>{data.objeto ?? '—'}</Linha>
          <Linha rotulo={t('credenciamentoDetalhe.secretaria')}>{data.secretariaSigla ?? '—'}</Linha>
          <Linha rotulo={t('credenciamentoDetalhe.capacidade')}>{t('credenciamentoDetalhe.capacidadeUnidades', { n: data.capacidadeTeto })}</Linha>
          <Linha rotulo={t('credenciamentoDetalhe.etapa')}>{t('meusCredenciamentos.etapa', { atual: data.passoAtual, total: data.totalPassos })}</Linha>
          <Linha rotulo={t('credenciamentoDetalhe.criadoEm')}>{formatarData(data.criadoEm)}</Linha>
          <Linha rotulo={t('credenciamentoDetalhe.atualizadoEm')}>{formatarData(data.atualizadoEm)}</Linha>
        </dl>
      </div>

      <div className="card" style={{ padding: 24, marginTop: 16 }} data-cy="termo">
        <h2 style={{ font: '600 16px var(--font-body)', color: 'var(--azul-900)', margin: '0 0 14px' }}>
          {t('credenciamentoDetalhe.termoTitulo')}
        </h2>
        {data.termo ? (
          <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 220px) 1fr', rowGap: 14, columnGap: 16, margin: 0 }}>
            <Linha rotulo={t('credenciamentoDetalhe.termoVersao')}>{data.termo.versao}</Linha>
            <Linha rotulo={t('credenciamentoDetalhe.termoFinalidade')}>{data.termo.finalidade}</Linha>
            <Linha rotulo={t('credenciamentoDetalhe.termoAceitoEm')}>{formatarData(data.termo.aceitoEm)}</Linha>
          </dl>
        ) : (
          <p data-cy="sem-termo" style={{ margin: 0, fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('credenciamentoDetalhe.semTermo')}</p>
        )}
      </div>
    </div>
  );
}

/** Par rótulo/valor do cartão de definições. */
function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <>
      <dt style={{ font: '600 13px var(--font-body)', color: 'var(--cinza-500)' }}>{rotulo}</dt>
      <dd style={{ margin: 0, fontSize: 14, color: 'var(--cinza-900)' }}>{children}</dd>
    </>
  );
}
