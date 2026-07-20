import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type AnaliseDocItem } from '../../lib/api';
import { mascaraCnpj } from '../../lib/br';
import { toastBus } from '../../design-system/components';

/**
 * Painel Admin · "Análise Documental" (covalidação — RF004 / UC006 / RN003). Fila GLOBAL de documentos
 * pendentes de todos os fornecedores: a CPL aprova ou reprova cada documento, e a reprovação exige
 * justificativa textual (modal obrigatório, RN003 — registrada na auditoria e vista pelo fornecedor).
 * Fiel ao protótipo `spec/Prototipo/painel-administrativo.html` (bloco `isAnalise`): cartão por documento
 * (ícone, título, empresa · CNPJ · enviado em, chip "Pendente", Visualizar documento, Reprovar/Aprovar) e
 * estado vazio "Nenhum documento na fila". O veredito reusa `POST /documentos/:id/covalidar`.
 */
export function AnaliseDocumental() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [reprovando, setReprovando] = useState<AnaliseDocItem | null>(null);
  const [motivo, setMotivo] = useState('');

  const { data: docs = [], isLoading, isError } = useQuery({
    queryKey: ['fila-analise'],
    queryFn: api.filaAnalise,
  });

  const decidir = useMutation({
    mutationFn: (v: { doc: AnaliseDocItem; resultado: 'aprovado' | 'reprovado'; justificativa?: string }) =>
      api.covalidar(v.doc.id, { resultado: v.resultado, justificativa: v.justificativa, empresaId: v.doc.fornecedorId }),
    onSuccess: (_r, v) => {
      toastBus.emitir({ tom: 'ok', texto: t(v.resultado === 'aprovado' ? 'admin.analiseDocumental.toastAprovado' : 'admin.analiseDocumental.toastReprovado', { empresa: v.doc.empresa }) });
      setReprovando(null);
      setMotivo('');
      void qc.invalidateQueries({ queryKey: ['fila-analise'] });
    },
    onError: () => toastBus.emitir({ tom: 'erro', texto: t('admin.analiseDocumental.toastErro') }),
  });

  return (
    <div style={{ animation: 'cmfade .28s' }} data-cy="admin-analise-documental">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.analiseDocumental.migalha')}</div>
        <h1 className="page-title" style={{ margin: '4px 0 3px' }}>
          {t('admin.analiseDocumental.titulo')} <span style={{ color: 'var(--cinza-400)', fontWeight: 500 }}>{t('admin.analiseDocumental.tituloComplemento')}</span>
        </h1>
        <div className="page-sub">{t('admin.analiseDocumental.subtitulo')}</div>
      </div>

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.analiseDocumental.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.analiseDocumental.erroCarregar')}</p>
      ) : docs.length === 0 ? (
        <div data-cy="vazio" style={estVazio}>
          <div style={estVazioIcone}><IconeCheckGrande /></div>
          <div style={{ font: '600 16px var(--font-body)', color: 'var(--azul-900)' }}>{t('admin.analiseDocumental.vazioTitulo')}</div>
          <div style={{ fontSize: 13.5, color: 'var(--cinza-500)', marginTop: 5 }}>{t('admin.analiseDocumental.vazioDica')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {docs.map((d) => (
            <div key={d.id} data-cy="doc-analise" data-id={d.id} style={cartao}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={iconeArquivo}><IconeArquivo /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--azul-900)' }}>{d.tipo}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 2 }}>
                      {d.empresa}{d.cnpj ? ` (${mascaraCnpj(d.cnpj)})` : ''} · {t('admin.analiseDocumental.enviadoEm', { data: formatarData(d.enviadoEm, i18n.language) })}
                    </div>
                  </div>
                </div>
                <span style={chipPendente}>{t('admin.analiseDocumental.pendente')}</span>
              </div>
              <div style={rodape}>
                <button type="button" data-cy="visualizar" style={botaoLink} title={t('admin.analiseDocumental.visualizar')}>
                  <IconeOlho />{t('admin.analiseDocumental.visualizar')}
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" data-cy="reprovar" onClick={() => { setMotivo(''); setReprovando(d); }} disabled={decidir.isPending} style={botaoReprovar}>
                    <IconeXCirculo />{t('admin.analiseDocumental.reprovar')}
                  </button>
                  <button type="button" data-cy="aprovar" onClick={() => decidir.mutate({ doc: d, resultado: 'aprovado' })} disabled={decidir.isPending} style={botaoAprovar}>
                    <IconeCheck />{t('admin.analiseDocumental.aprovar')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reprovando && (
        <ModalReprovar
          doc={reprovando}
          motivo={motivo}
          onMotivo={setMotivo}
          pendente={decidir.isPending}
          onCancelar={() => setReprovando(null)}
          onConfirmar={() => decidir.mutate({ doc: reprovando, resultado: 'reprovado', justificativa: motivo.trim() })}
        />
      )}
    </div>
  );
}

/** Modal de reprovação — justificativa obrigatória (RN003). Fiel ao protótipo (bloco de reprovação). */
function ModalReprovar({ doc, motivo, onMotivo, pendente, onCancelar, onConfirmar }: {
  doc: AnaliseDocItem; motivo: string; onMotivo: (v: string) => void; pendente: boolean; onCancelar: () => void; onConfirmar: () => void;
}) {
  const { t } = useTranslation();
  const invalido = !motivo.trim() || pendente;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancelar]);

  return (
    <div style={overlay} onClick={onCancelar} data-cy="modal-overlay">
      <div style={modalCard} role="dialog" aria-modal="true" aria-label={t('admin.analiseDocumental.modal.titulo')} data-cy="modal-reprovar" onClick={(e) => e.stopPropagation()}>
        <header style={{ display: 'flex', gap: 14, padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
          <div style={modalIconeErro}><IconeXCirculo /></div>
          <div>
            <div style={{ font: '600 16.5px var(--font-body)', color: 'var(--azul-900)' }}>{t('admin.analiseDocumental.modal.titulo')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 1 }}>{doc.tipo} — {doc.empresa}</div>
          </div>
        </header>
        <div style={{ padding: '20px 24px' }}>
          <label htmlFor="justificativa-reprovacao" style={{ font: '600 12.5px var(--font-body)', color: 'var(--cinza-700)', marginBottom: 7, display: 'block' }}>
            {t('admin.analiseDocumental.modal.label')} <span style={{ color: 'var(--erro-700)' }}>*</span>
          </label>
          <textarea
            id="justificativa-reprovacao"
            data-cy="campo-justificativa"
            value={motivo}
            onChange={(e) => onMotivo(e.target.value)}
            placeholder={t('admin.analiseDocumental.modal.placeholder')}
            style={textarea}
          />
          <div style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 7 }}>{t('admin.analiseDocumental.modal.aviso')}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 24px 22px' }}>
          <button type="button" data-cy="cancelar-reprovar" onClick={onCancelar} style={botaoCancelar}>{t('admin.analiseDocumental.modal.cancelar')}</button>
          <button type="button" data-cy="confirmar-reprovar" onClick={onConfirmar} disabled={invalido} style={{ ...botaoConfirmar, opacity: invalido ? 0.5 : 1, cursor: invalido ? 'not-allowed' : 'pointer' }}>
            {t('admin.analiseDocumental.modal.confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Data ISO → data local curta (ex.: 2026-06-15). Mantém `YYYY-MM-DD` como o protótipo. */
function formatarData(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ————— estilos (fiéis ao protótipo `isAnalise`) —————
const cartao: CSSProperties = { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' };
const iconeArquivo: CSSProperties = { width: 46, height: 46, borderRadius: 11, background: 'var(--atencao-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8A5410' };
const chipPendente: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', background: 'var(--atencao-bg)', color: '#8A5410', whiteSpace: 'nowrap' };
const rodape: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--divider)', flexWrap: 'wrap' };
const botaoLink: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', font: '500 13.5px var(--font-body)', color: 'var(--azul-700)' };
const botaoReprovar: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: '1.5px solid var(--erro)', borderRadius: 9, background: '#fff', color: 'var(--erro-700)', font: '600 14px var(--font-body)', cursor: 'pointer' };
const botaoAprovar: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: 'none', borderRadius: 9, background: 'var(--sucesso)', color: '#fff', font: '600 14px var(--font-body)', cursor: 'pointer' };
const estVazio: CSSProperties = { background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '56px 24px', textAlign: 'center' };
const estVazioIcone: CSSProperties = { width: 60, height: 60, borderRadius: '50%', background: 'var(--sucesso-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--sucesso)' };
const overlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 };
const modalCard: CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(520px, 100%)', boxShadow: '0 20px 50px rgba(0,0,0,.25)' };
const modalIconeErro: CSSProperties = { width: 44, height: 44, borderRadius: 11, background: 'var(--erro-bg)', color: 'var(--erro-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const textarea: CSSProperties = { width: '100%', minHeight: 110, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, font: '14px var(--font-body)', background: '#fff', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' };
const botaoCancelar: CSSProperties = { padding: '11px 20px', border: '1.5px solid var(--border)', borderRadius: 9, background: '#fff', color: 'var(--cinza-700)', font: '600 14px var(--font-body)', cursor: 'pointer' };
const botaoConfirmar: CSSProperties = { padding: '11px 20px', border: 'none', borderRadius: 9, background: 'var(--erro)', color: '#fff', font: '600 14px var(--font-body)' };

// ————— ícones inline (mesmos traços do protótipo) —————
const svg = (children: React.ReactNode, size = 16, sw = 2): React.ReactElement => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);
const IconeArquivo = () => svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>, 22, 1.7);
const IconeOlho = () => svg(<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></>, 16, 1.8);
const IconeXCirculo = () => svg(<><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>, 16, 2);
const IconeCheck = () => svg(<polyline points="20 6 9 17 4 12" />, 16, 2.2);
const IconeCheckGrande = () => svg(<polyline points="20 6 9 17 4 12" />, 30, 1.8);
