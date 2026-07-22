import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { api, type DocItem, type CatalogoItemView } from '../../lib/api';
import { MIME, TAMANHO_MAX_MB, formatoDe, lerBase64 } from '../../lib/upload';
import { Pill, Botao } from '../../design-system/components';
import { toastBus } from '../../design-system/components/toast-bus';
import { IconeDocumentos, IconeUpload, IconeDownload, IconeOlho, IconeAlerta, IconeSync, IconeFechar } from '../../design-system/icons';

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

/** Dispara o download de um data URL como arquivo, sem navegar para fora da SPA. */
function baixarDataUrl(url: string, nomeArquivo: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Repositório documental (FR-007/008) — upload cifrado, lista com validade/status e visualizar/baixar. */
export function Documentos({ fornecedorId }: { fornecedorId: string }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const agora = Date.now();
  const [uploadAberto, setUploadAberto] = useState(false);
  const [preview, setPreview] = useState<DocItem | null>(null);
  const { data: docs = [] } = useQuery({ queryKey: ['documentos', fornecedorId], queryFn: () => api.documentos(fornecedorId) });

  const reenviar = useMutation({
    mutationFn: (docId: string) => api.reenviarDocumento(docId),
    onSuccess: () => {
      toastBus.emitir({ tom: 'ok', texto: t('documentos.reenvioSucesso') });
      void qc.invalidateQueries({ queryKey: ['documentos', fornecedorId] });
    },
  });

  /** Baixa (decifra no backend) e dispara o arquivo direto, sem abrir o preview. */
  const baixar = useMutation({
    mutationFn: (doc: DocItem) => api.baixarConteudo(doc.id),
    onSuccess: (c, doc) => baixarDataUrl(`data:${MIME[c.formato]};base64,${c.conteudo}`, `${doc.tipo}.${c.formato}`),
    onError: () => toastBus.emitir({ tom: 'erro', texto: t('documentos.erroBaixar') }),
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

      {/* Área de envio / upload — abre o modal de envio (tipo + arquivo + validade) */}
      <button
        type="button"
        data-cy="upload"
        onClick={() => setUploadAberto(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', width: '100%', textAlign: 'left',
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
      </button>

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

        {docs.length === 0 && (
          <div data-cy="doc-vazio" style={{ padding: '48px 22px', textAlign: 'center', color: 'var(--cinza-500)', fontSize: 14 }}>
            {t('documentos.listaVazia')}
          </div>
        )}

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
                    data-cy="visualizar"
                    aria-label={t('documentos.visualizarDocumento', { tipo: d.tipo })}
                    onClick={() => setPreview(d)}
                    style={acaoIconeStyle}
                  >
                    <IconeOlho width={17} height={17} />
                  </button>
                  <button
                    type="button"
                    data-cy="baixar"
                    aria-label={t('documentos.baixarDocumento', { tipo: d.tipo })}
                    disabled={baixar.isPending}
                    onClick={() => baixar.mutate(d)}
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

      {uploadAberto && (
        <ModalUpload
          fornecedorId={fornecedorId}
          onFechar={() => setUploadAberto(false)}
          onEnviado={() => {
            setUploadAberto(false);
            toastBus.emitir({ tom: 'ok', texto: t('documentos.uploadSucesso') });
            void qc.invalidateQueries({ queryKey: ['documentos', fornecedorId] });
          }}
        />
      )}

      {preview && <ModalPreview doc={preview} onFechar={() => setPreview(null)} />}
    </div>
  );
}

/** Modal de envio: escolhe o Tipo de Documento (catálogo), o arquivo (PDF/JPG/PNG) e a validade opcional. */
function ModalUpload({ fornecedorId, onFechar, onEnviado }: { fornecedorId: string; onFechar: () => void; onEnviado: () => void }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState('');
  const [validade, setValidade] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Catálogo de tipos exigidos (RF022) — só ativos, carregado quando o modal abre.
  const { data: tipos = [] } = useQuery({
    queryKey: ['catalogo', 'tipos-documento'],
    queryFn: () => api.catalogoListar('tipos-documento'),
  });

  useEffect(() => {
    const h = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const escolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErro(null);
    const f = e.target.files?.[0] ?? null;
    if (f && !formatoDe(f.name)) { setErro(t('documentos.modalUpload.erroFormato')); setArquivo(null); return; }
    if (f && f.size > TAMANHO_MAX_MB * 1024 * 1024) { setErro(t('documentos.modalUpload.erroTamanho', { mb: TAMANHO_MAX_MB })); setArquivo(null); return; }
    setArquivo(f);
  };

  const enviar = useMutation({
    mutationFn: async () => {
      if (!tipo) throw new Error('tipo');
      if (!arquivo) throw new Error('arquivo');
      const formato = formatoDe(arquivo.name)!;
      const conteudo = await lerBase64(arquivo);
      await api.enviarDocumento(fornecedorId, { tipo, formato, conteudo, dataValidade: validade || null });
    },
    onSuccess: onEnviado,
    onError: (e) => setErro(
      (e as Error).message === 'tipo' ? t('documentos.modalUpload.erroTipoObrigatorio')
      : (e as Error).message === 'arquivo' ? t('documentos.modalUpload.erroArquivoObrigatorio')
      : t('documentos.modalUpload.erroEnviar'),
    ),
  });

  const titulo = t('documentos.modalUpload.titulo');
  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={card} role="dialog" aria-modal="true" aria-label={titulo} data-cy="modal-upload" onClick={(ev) => ev.stopPropagation()}>
        <header style={cabecalho}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--azul-900)' }}>{titulo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('documentos.modalUpload.subtitulo')}</p>
          </div>
          <button type="button" onClick={onFechar} style={botaoX} data-cy="fechar-modal" aria-label={t('documentos.modalUpload.cancelar')}><IconeFechar width={20} height={20} /></button>
        </header>

        <form data-cy="form-upload" onSubmit={(ev) => { ev.preventDefault(); enviar.mutate(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: 24, overflowY: 'auto', display: 'grid', gap: 18 }}>
            <label>
              <span style={rotulo}>{t('documentos.modalUpload.campoTipo')}</span>
              <select className="input" data-cy="campo-tipo" required value={tipo} onChange={(ev) => setTipo(ev.target.value)} style={{ width: '100%' }}>
                <option value="" disabled>{t('documentos.modalUpload.selecioneTipo')}</option>
                {(tipos as CatalogoItemView[]).map((it) => (
                  <option key={it.id} value={it.nome ?? ''}>{it.nome}</option>
                ))}
              </select>
            </label>

            <label>
              <span style={rotulo}>{t('documentos.modalUpload.campoArquivo')}</span>
              <input
                ref={inputRef}
                className="input"
                data-cy="campo-arquivo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={escolherArquivo}
                style={{ width: '100%' }}
              />
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 6 }}>
                {t('documentos.modalUpload.arquivoAjuda', { mb: TAMANHO_MAX_MB })}
              </span>
            </label>

            <label>
              <span style={rotulo}>{t('documentos.modalUpload.campoValidade')}</span>
              <input className="input" data-cy="campo-validade" type="date" value={validade} onChange={(ev) => setValidade(ev.target.value)} style={{ width: '100%' }} />
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 6 }}>
                {t('documentos.modalUpload.validadeAjuda')}
              </span>
            </label>

            {erro && <p role="alert" data-cy="erro-upload" style={{ margin: 0, fontSize: 13, color: 'var(--erro)' }}>{erro}</p>}
          </div>

          <footer style={rodape}>
            <Botao type="button" variante="secundario" data-cy="cancelar" onClick={onFechar}>{t('documentos.modalUpload.cancelar')}</Botao>
            <Botao type="submit" data-cy="enviar-documento" disabled={enviar.isPending}>{t('documentos.modalUpload.enviar')}</Botao>
          </footer>
        </form>
      </div>
    </div>
  );
}

/** Modal de preview inline: busca o arquivo decifrado e o exibe (PDF em iframe, imagem em <img>). */
function ModalPreview({ doc, onFechar }: { doc: DocItem; onFechar: () => void }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['documento-conteudo', doc.id],
    queryFn: () => api.baixarConteudo(doc.id),
    staleTime: 60_000,
  });

  useEffect(() => {
    const h = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  const url = data ? `data:${MIME[data.formato]};base64,${data.conteudo}` : null;

  return (
    <div style={overlay} onClick={onFechar} data-cy="modal-overlay">
      <div style={{ ...card, width: 'min(920px, 100%)' }} role="dialog" aria-modal="true" aria-label={doc.tipo} data-cy="modal-preview" onClick={(ev) => ev.stopPropagation()}>
        <header style={cabecalho}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--azul-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.tipo}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('documentos.preview.subtitulo')}</p>
          </div>
          <button type="button" onClick={onFechar} style={botaoX} data-cy="fechar-modal" aria-label={t('documentos.preview.fechar')}><IconeFechar width={20} height={20} /></button>
        </header>

        <div style={{ padding: 24, overflow: 'auto', flex: 1, minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cinza-50, #f8fafc)' }}>
          {isLoading && <span style={{ color: 'var(--cinza-500)', fontSize: 14 }}>{t('documentos.preview.carregando')}</span>}
          {isError && <span role="alert" style={{ color: 'var(--erro)', fontSize: 14 }}>{t('documentos.preview.erro')}</span>}
          {url && data?.formato === 'pdf' && (
            <iframe title={doc.tipo} data-cy="preview-pdf" src={url} style={{ width: '100%', height: '62vh', border: 'none', background: '#fff', borderRadius: 8 }} />
          )}
          {url && data?.formato !== 'pdf' && (
            <img alt={doc.tipo} data-cy="preview-img" src={url} style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', borderRadius: 8 }} />
          )}
        </div>

        <footer style={rodape}>
          <Botao type="button" variante="secundario" data-cy="fechar-preview" onClick={onFechar}>{t('documentos.preview.fechar')}</Botao>
          <Botao
            type="button"
            data-cy="baixar-preview"
            disabled={!url}
            onClick={() => url && baixarDataUrl(url, `${doc.tipo}.${data!.formato}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <IconeDownload width={16} height={16} />
            {t('documentos.preview.baixar')}
          </Botao>
        </footer>
      </div>
    </div>
  );
}

const acaoIconeStyle: CSSProperties = {
  width: 36, height: 36, border: '1px solid var(--border)', borderRadius: 8, background: '#fff',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cinza-700)',
};
const overlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 };
const card: CSSProperties = { background: '#fff', borderRadius: 16, width: 'min(600px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,.25)' };
const cabecalho: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '20px 24px', borderBottom: '1px solid var(--divider)' };
const rodape: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--divider)', background: 'var(--cinza-50, #f8fafc)', borderRadius: '0 0 16px 16px' };
const botaoX: CSSProperties = { width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--cinza-100, #eef1f5)', color: 'var(--cinza-500)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const rotulo: CSSProperties = { font: '600 13px var(--font-body)', color: 'var(--azul-900)', marginBottom: 6, display: 'block' };
