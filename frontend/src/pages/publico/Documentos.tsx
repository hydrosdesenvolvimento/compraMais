import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { api, type DocItem } from '../../lib/api';
import { Pill } from '../../design-system/components';
import { toastBus } from '../../design-system/components/toast-bus';
import { IconeDocumentos, IconeUpload, IconeDownload, IconeOlho, IconeAlerta, IconeSync } from '../../design-system/icons';

/** Janela (em dias) para sinalizar "Vence em N dias" antes do vencimento — alinhada ao aviso da topbar. */
const JANELA_A_VENCER = 30;

type Tom = 'success' | 'warn' | 'error' | 'neutral';

/** Estado visível na tela, derivado do status de covalidação + validade (sem endpoint novo). */
interface EstadoDoc {
  tom: Tom;
  chave: string;
  valores?: Record<string, number>;
  reprovado: boolean;
  expirado: boolean;
}

function diasAte(dataIso: string, agora: number): number {
  return Math.ceil((new Date(dataIso).getTime() - agora) / 86_400_000);
}

/**
 * Mapeia o documento para o estado da UI do protótipo (Aprovado · Vence em N dias · Reprovado ·
 * Vencido · Em análise). A fonte da verdade é o backend: `status` de covalidação (UC006) + `situacao`
 * (vigente|expirado, RN vencimento) + `dataValidade`.
 */
function derivarEstado(d: DocItem, agora: number): EstadoDoc {
  if (d.status === 'reprovado') return { tom: 'error', chave: 'documentos.statusReprovado', reprovado: true, expirado: false };
  if (d.status === 'pendente') return { tom: 'neutral', chave: 'documentos.statusEmAnalise', reprovado: false, expirado: false };
  // aprovado:
  if (d.situacao === 'expirado') return { tom: 'error', chave: 'documentos.statusVencido', reprovado: false, expirado: true };
  if (d.dataValidade) {
    const dias = diasAte(d.dataValidade, agora);
    if (dias <= JANELA_A_VENCER) return { tom: 'warn', chave: 'documentos.statusVenceEm', valores: { count: Math.max(dias, 0) }, reprovado: false, expirado: false };
  }
  return { tom: 'success', chave: 'documentos.statusAprovado', reprovado: false, expirado: false };
}

/** Repositório documental (FR-007/008) — upload + lista com validade, status de covalidação e reenvio. */
export function Documentos({ fornecedorId }: { fornecedorId: string }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const agora = Date.now();
  const { data: docs = [] } = useQuery({ queryKey: ['documentos', fornecedorId], queryFn: () => api.documentos(fornecedorId) });

  const reenviar = useMutation({
    mutationFn: (docId: string) => api.reenviarDocumento(docId),
    onSuccess: () => {
      toastBus.emitir({ tom: 'ok', texto: t('documentos.reenvioSucesso') });
      void qc.invalidateQueries({ queryKey: ['documentos', fornecedorId] });
    },
  });

  const fmtData = (iso: string | null): string =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)) : '—';

  const estados = docs.map((d) => derivarEstado(d, agora));
  const alertaCount = estados.filter((e) => e.reprovado || e.expirado).length;

  return (
    <div className="stack" style={{ animation: 'cmfade .3s' }}>
      <div className="cm-page-head">
        <div>
          <h1 className="cm-page-title">{t('documentos.tituloPagina')}</h1>
          <p className="cm-page-sub">{t('documentos.subtituloPagina')}</p>
        </div>
      </div>

      {/* Área de envio / upload */}
      <label
        htmlFor="doc-upload"
        style={{
          display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
          padding: '18px 22px', marginBottom: 4, background: 'var(--azul-50)',
          border: '1px dashed var(--azul-300)', borderRadius: 'var(--radius-lg)',
        }}
      >
        <span
          style={{
            width: 42, height: 42, borderRadius: 10, background: 'var(--azul-700)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <IconeUpload width={20} height={20} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>
            {t('documentos.enviarNovo')}
          </span>
          <span style={{ display: 'block', fontSize: 13, color: 'var(--cinza-500)', marginTop: 2 }}>
            {t('documentos.formatosAceitos')}
          </span>
        </span>
        <input id="doc-upload" data-cy="upload" type="file" accept=".pdf,.jpg,.png" style={{ display: 'none' }} />
      </label>

      {/* Cartão de destaque para pendências (documentos reprovados ou vencidos) */}
      {alertaCount > 0 && (
        <div
          style={{
            display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap',
            padding: '14px 18px', background: 'var(--erro-bg)', borderRadius: 'var(--radius-md)',
          }}
        >
          <IconeAlerta width={19} height={19} style={{ color: 'var(--erro-700)', flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, color: 'var(--erro-700)', lineHeight: 1.5 }}>
            <Trans
              i18nKey="documentos.alertaPendencias"
              count={alertaCount}
              values={{ count: alertaCount }}
              components={{ b: <strong /> }}
            />
          </span>
        </div>
      )}

      {/* Lista de documentos exigidos */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
        <div
          className="cm-hide-sm"
          style={{
            display: 'grid', gridTemplateColumns: '2.4fr 1fr 1.1fr 1.3fr', gap: 12,
            padding: '14px 22px', borderBottom: '1px solid var(--divider)', background: '#E2E7EE',
            font: '600 11px var(--font-body)', letterSpacing: '.08em', color: 'var(--azul-900)',
          }}
        >
          <div>{t('documentos.colunaDocumento')}</div>
          <div>{t('documentos.colunaValidade')}</div>
          <div>{t('documentos.colunaStatus')}</div>
          <div style={{ textAlign: 'right' }}>{t('documentos.colunaAcoes')}</div>
        </div>

        {docs.map((d, i) => {
          const e = estados[i]!;
          const destaque = e.reprovado || e.expirado;
          return (
            <div
              key={d.id}
              data-cy="doc-row"
              style={{ borderBottom: '1px solid var(--divider)', borderLeft: destaque ? '3px solid var(--erro)' : '3px solid transparent' }}
            >
              <div
                className="cm-grid-2"
                style={{
                  display: 'grid', gridTemplateColumns: '2.4fr 1fr 1.1fr 1.3fr', gap: 12,
                  padding: '16px 22px', alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span
                    style={{
                      width: 36, height: 36, borderRadius: 9, background: 'var(--azul-50)', color: 'var(--azul-700)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <IconeDocumentos width={18} height={18} />
                  </span>
                  <span style={{ font: '600 14.5px var(--font-body)', color: 'var(--text-title)' }}>{d.tipo}</span>
                </div>

                <div style={{ fontSize: 14, color: 'var(--cinza-500)' }}>{fmtData(d.dataValidade)}</div>

                <div>
                  <Pill tom={e.tom}>{t(e.chave, e.valores)}</Pill>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    aria-label={t('documentos.visualizarDocumento', { tipo: d.tipo })}
                    style={acaoIconeStyle}
                  >
                    <IconeOlho width={17} height={17} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('documentos.baixarDocumento', { tipo: d.tipo })}
                    style={acaoIconeStyle}
                  >
                    <IconeDownload width={17} height={17} />
                  </button>
                </div>
              </div>

              {/* Tarja de reprovação (UC006/FR-010) — motivo da CPL + reenvio do documento corrigido */}
              {e.reprovado && (
                <div
                  style={{
                    margin: '0 22px 16px', padding: '14px 16px', background: 'var(--erro-bg)', borderRadius: 10,
                    display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220, display: 'flex', gap: 11 }}>
                    <IconeAlerta width={19} height={19} style={{ color: 'var(--erro-700)', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 13, color: 'var(--erro-700)', lineHeight: 1.5 }}>
                      <strong>{t('documentos.reprovadoPelaCpl')}</strong>{' '}
                      {d.motivoReprovacao ?? t('documentos.motivoIndisponivel')}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-cy="reenviar-corrigido"
                    className="btn btn-danger"
                    disabled={reenviar.isPending}
                    onClick={() => reenviar.mutate(d.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <IconeSync width={16} height={16} />
                    {t('documentos.reenviarCorrigido')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const acaoIconeStyle: CSSProperties = {
  width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8, background: '#fff',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cinza-700)',
};
