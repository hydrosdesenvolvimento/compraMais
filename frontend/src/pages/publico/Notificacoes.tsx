import { useMemo, useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoItemView, type NotificacaoView } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { renderNotificacao } from '../../lib/notificacoes-render';
import { construirNotificacoesFornecedor } from '../../lib/notificacoes-fornecedor';
import { IconeRelogio, IconeEditais, IconeFechar } from '../../design-system/icons';
import { Botao } from '../../design-system/components';

const cardBase: CSSProperties = { display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)', background: '#fff', width: '100%' };
const conteudoBtn: CSSProperties = { display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 0, border: 'none', background: 'none', textAlign: 'left', padding: 0, cursor: 'pointer', font: 'inherit' };
const acaoBtn: CSSProperties = { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid var(--border)', background: '#fff', color: 'var(--cinza-600)', borderRadius: 8, padding: '5px 9px', font: '600 12px var(--font-body)', cursor: 'pointer' };

/**
 * Página "Notificações" do fornecedor (histórico persistido + lidas/não-lidas). Lista as notificações
 * event-sourced, destaca as não-lidas, marca como lida ao abrir e navega para o contexto. Cada
 * notificação JÁ LIDA pode ser OCULTA individualmente (some do histórico, reversível); o select
 * "Exibir notificações ocultas" traz as ocultas de volta para reexibi-las. Somente do fornecedor do token.
 */
export function Notificacoes() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const empresaId = obterUsuario()?.empresaId;
  const [exibirOcultas, setExibirOcultas] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['notificacoes-pagina', exibirOcultas], queryFn: () => api.notificacoes(1, 50, exibirOcultas), enabled: !!empresaId });
  const secretarias = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias') });
  const documentos = useQuery({ queryKey: ['documentos', empresaId], queryFn: () => api.documentos(empresaId as string), enabled: !!empresaId });
  const invalidar = () => { void qc.invalidateQueries({ queryKey: ['notificacoes-pagina'] }); void qc.invalidateQueries({ queryKey: ['notificacoes'] }); };
  const marcarLida = useMutation({ mutationFn: (id: string) => api.marcarNotificacaoLida(id), onSuccess: invalidar });
  const marcarTodas = useMutation({ mutationFn: () => api.marcarNotificacoesLidas(), onSuccess: invalidar });
  const ocultar = useMutation({ mutationFn: (id: string) => api.ocultarNotificacao(id), onSuccess: invalidar });
  const reexibir = useMutation({ mutationFn: (id: string) => api.reexibirNotificacao(id), onSuccess: invalidar });

  const secretariasLista = (secretarias.data as CatalogoItemView[] | undefined) ?? [];
  const siglaDe = (id: string): string => { const s = secretariasLista.find((x) => x.id === id); return s?.sigla ?? s?.nome ?? id; };
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' });

  const itens = useMemo(() => data?.itens ?? [], [data]);
  const naoLidas = data?.naoLidas ?? 0;
  // Alertas ao vivo (documento a vencer/vencido) — derivados do estado atual, sem histórico/lida.
  const alertas = useMemo(
    () => construirNotificacoesFornecedor(documentos.data ?? [], [], secretariasLista, t, i18n.language),
    [documentos.data, secretariasLista, t, i18n.language],
  );

  function abrir(n: NotificacaoView, href: string | null) {
    if (!n.lida) marcarLida.mutate(n.id);
    if (href) void navigate({ to: href });
  }

  if (!empresaId) return <p data-cy="sem-empresa" className="page-sub">{t('demandasDistribuidas.semEmpresa')}</p>;

  return (
    <div className="stack" data-cy="notificacoes-pagina">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{t('notificacoes.titulo')}</h1>
          <p className="page-sub">{t('notificacoes.subtitulo')}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label data-cy="exibir-ocultas" style={{ display: 'inline-flex', gap: 7, alignItems: 'center', fontSize: 13.5, color: 'var(--cinza-700)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" data-cy="exibir-ocultas-check" checked={exibirOcultas} onChange={(e) => setExibirOcultas(e.target.checked)} />
            {t('notificacoes.exibirOcultas')}
          </label>
          {naoLidas > 0 && (
            <Botao data-cy="marcar-todas" variante="secundario" onClick={() => marcarTodas.mutate()} disabled={marcarTodas.isPending}>
              {t('notificacoes.marcarTodas')}
            </Botao>
          )}
        </div>
      </div>

      {alertas.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }} data-cy="alertas">
          <h2 className="page-sub" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--cinza-500)', margin: 0 }}>{t('notificacoes.alertas')}</h2>
          {alertas.map((a, i) => (
            <div key={`alerta-${i}`} data-cy="alerta" style={{ ...cardBase, borderColor: 'var(--amarelo-300, #e6c47a)', background: 'var(--amarelo-50, #fdf6e3)' }}>
              <span style={{ flexShrink: 0, marginTop: 1, color: a.tom === 'atencao' ? '#8A5410' : 'var(--azul-600)' }}>
                {a.tom === 'atencao' ? <IconeRelogio width={20} height={20} /> : <IconeEditais width={20} height={20} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--azul-900)' }}><strong>{a.titulo}</strong> <span style={{ color: 'var(--cinza-700)' }}>{a.texto}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('notificacoes.carregando')}</p>
      ) : itens.length === 0 ? (
        alertas.length === 0 && <div data-cy="vazio" className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>{t('notificacoes.vazio')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {itens.map((n) => {
            const r = renderNotificacao(n, t, siglaDe);
            const cor = r.tom === 'atencao' ? '#8A5410' : 'var(--azul-600)';
            return (
              <div key={n.id} data-cy="notificacao" data-tipo={n.tipo} data-lida={n.lida} data-oculta={n.oculta}
                style={{ ...cardBase, opacity: n.oculta ? 0.7 : 1, borderColor: n.lida ? 'var(--border)' : 'var(--azul-300, #9db8e0)', background: n.oculta ? 'var(--cinza-50, #f7f8fa)' : n.lida ? '#fff' : 'var(--azul-50)' }}>
                <button type="button" data-cy="abrir-notificacao" onClick={() => abrir(n, r.href)} style={conteudoBtn}>
                  <span style={{ flexShrink: 0, marginTop: 1, color: cor }}>
                    {r.tom === 'atencao' ? <IconeRelogio width={20} height={20} /> : <IconeEditais width={20} height={20} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, lineHeight: 1.5, color: 'var(--azul-900)' }}><strong>{r.titulo}</strong> <span style={{ color: 'var(--cinza-700)' }}>{r.texto}</span></span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--cinza-400)', marginTop: 4 }}>{fmt(n.criadoEm)}</span>
                  </span>
                  {!n.lida && <span data-cy="nao-lida" aria-label={t('notificacoes.naoLida')} style={{ flexShrink: 0, width: 9, height: 9, borderRadius: 999, background: 'var(--azul-700)', marginTop: 6 }} />}
                </button>
                {/* Ocultar (só nas já LIDAS) / Reexibir (nas ocultas) — individual por notificação. */}
                {n.oculta ? (
                  <button type="button" data-cy="reexibir-notificacao" onClick={() => reexibir.mutate(n.id)} disabled={reexibir.isPending} style={acaoBtn} title={t('notificacoes.reexibir')}>
                    {t('notificacoes.reexibir')}
                  </button>
                ) : n.lida ? (
                  <button type="button" data-cy="ocultar-notificacao" onClick={() => ocultar.mutate(n.id)} disabled={ocultar.isPending} style={acaoBtn} aria-label={t('notificacoes.ocultar')} title={t('notificacoes.ocultar')}>
                    <IconeFechar width={13} height={13} /> {t('notificacoes.ocultar')}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
