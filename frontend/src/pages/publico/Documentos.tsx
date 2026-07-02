import { useQuery } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { api } from '../../lib/api';
import { Pill } from '../../design-system/components';
import { IconeDocumentos, IconeUpload, IconeDownload, IconeAlerta } from '../../design-system/icons';

/** Repositório documental (FR-007/008) — upload + lista com status vigente/expirado. Query. */
export function Documentos({ fornecedorId }: { fornecedorId: string }) {
  const { t } = useTranslation();
  const { data: docs = [] } = useQuery({ queryKey: ['documentos', fornecedorId], queryFn: () => api.documentos(fornecedorId) });

  const pendentes = docs.filter((d) => d.situacao === 'expirado');

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

      {/* Cartão de destaque para pendências */}
      {pendentes.length > 0 && (
        <div
          style={{
            display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap',
            padding: '14px 18px', background: 'var(--erro-bg)', borderRadius: 'var(--radius-md)',
          }}
        >
          <IconeAlerta width={19} height={19} style={{ color: 'var(--erro-700)', flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, color: 'var(--erro-700)', lineHeight: 1.5 }}>
            <Trans
              i18nKey="documentos.alertaExpirados"
              count={pendentes.length}
              values={{ count: pendentes.length }}
              components={{ b: <strong /> }}
            />
          </span>
        </div>
      )}

      {/* Lista de documentos exigidos */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid', gridTemplateColumns: '2.4fr 1.1fr 1.3fr', gap: 12,
            padding: '14px 22px', borderBottom: '1px solid var(--divider)', background: '#E2E7EE',
            font: '600 11px var(--font-body)', letterSpacing: '.08em', color: 'var(--azul-900)',
          }}
        >
          <div>{t('documentos.colunaDocumento')}</div>
          <div>{t('documentos.colunaStatus')}</div>
          <div style={{ textAlign: 'right' }}>{t('documentos.colunaAcoes')}</div>
        </div>

        {docs.map((d) => {
          const expirado = d.situacao === 'expirado';
          return (
            <div
              key={d.id}
              style={{ borderBottom: '1px solid var(--divider)', borderLeft: expirado ? '3px solid var(--erro)' : '3px solid transparent' }}
            >
              <div
                style={{
                  display: 'grid', gridTemplateColumns: '2.4fr 1.1fr 1.3fr', gap: 12,
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
                  <span style={{ font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>{d.tipo}</span>
                </div>

                <div>
                  <Pill tom={expirado ? 'error' : 'success'}>{d.situacao === 'vigente' ? t('documentos.statusVigente') : t('documentos.statusExpirado')}</Pill>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    aria-label={t('documentos.baixarDocumento', { tipo: d.tipo })}
                    style={{
                      width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8, background: '#fff',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cinza-700)',
                    }}
                  >
                    <IconeDownload width={17} height={17} />
                  </button>
                  <button
                    type="button"
                    className={`btn ${expirado ? 'btn-amber' : 'btn-ghost'}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                  >
                    <IconeUpload width={16} height={16} />
                    {expirado ? t('documentos.atualizarDocumento') : t('documentos.reenviar')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
