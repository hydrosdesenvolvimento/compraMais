import { useMemo, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoItemView, type NotificacaoView } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { renderNotificacao } from '../../lib/notificacoes-render';
import { construirNotificacoesFornecedor } from '../../lib/notificacoes-fornecedor';
import { IconeRelogio, IconeEditais } from '../../design-system/icons';
import { Botao } from '../../design-system/components';

const cardBase: CSSProperties = { display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)', background: '#fff', textAlign: 'left', width: '100%', cursor: 'pointer' };

/**
 * Página "Notificações" do fornecedor (histórico persistido + lidas/não-lidas). Lista as notificações
 * event-sourced (credenciamento, distribuição, edital compatível, correção), destaca as não-lidas,
 * marca como lida ao abrir e navega para o contexto (edital/documentos). Somente do fornecedor do token.
 */
export function Notificacoes() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const empresaId = obterUsuario()?.empresaId;

  const { data, isLoading } = useQuery({ queryKey: ['notificacoes-pagina'], queryFn: () => api.notificacoes(1, 50), enabled: !!empresaId });
  const secretarias = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias') });
  const documentos = useQuery({ queryKey: ['documentos', empresaId], queryFn: () => api.documentos(empresaId as string), enabled: !!empresaId });
  const invalidar = () => { void qc.invalidateQueries({ queryKey: ['notificacoes-pagina'] }); void qc.invalidateQueries({ queryKey: ['notificacoes'] }); };
  const marcarLida = useMutation({ mutationFn: (id: string) => api.marcarNotificacaoLida(id), onSuccess: invalidar });
  const marcarTodas = useMutation({ mutationFn: () => api.marcarNotificacoesLidas(), onSuccess: invalidar });

  const secretariasLista = (secretarias.data as CatalogoItemView[] | undefined) ?? [];
  const siglaDe = (id: string): string => { const s = secretariasLista.find((x) => x.id === id); return s?.sigla ?? s?.nome ?? id; };
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit', year: 'numeric' });

  const itens = useMemo(() => data?.itens ?? [], [data]);
  const naoLidas = data?.naoLidas ?? 0;
  // Alertas ao vivo (documento a vencer/vencido) — derivados do estado atual, sem histórico/lida.
  // Espelham o sino; ficam acima do histórico persistido para a página não "não listar" o que o sino mostra.
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
        {naoLidas > 0 && (
          <Botao data-cy="marcar-todas" variante="secundario" onClick={() => marcarTodas.mutate()} disabled={marcarTodas.isPending}>
            {t('notificacoes.marcarTodas')}
          </Botao>
        )}
      </div>

      {alertas.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }} data-cy="alertas">
          <h2 className="page-sub" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--cinza-500)', margin: 0 }}>{t('notificacoes.alertas')}</h2>
          {alertas.map((a, i) => (
            <div key={`alerta-${i}`} data-cy="alerta" style={{ ...cardBase, cursor: 'default', borderColor: 'var(--amarelo-300, #e6c47a)', background: 'var(--amarelo-50, #fdf6e3)' }}>
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
            return (
              <button key={n.id} type="button" data-cy="notificacao" data-tipo={n.tipo} data-lida={n.lida}
                onClick={() => abrir(n, r.href)}
                style={{ ...cardBase, borderColor: n.lida ? 'var(--border)' : 'var(--azul-300, #9db8e0)', background: n.lida ? '#fff' : 'var(--azul-50)' }}>
                <span style={{ flexShrink: 0, marginTop: 1, color: r.tom === 'atencao' ? '#8A5410' : 'var(--azul-600)' }}>
                  {r.tom === 'atencao' ? <IconeRelogio width={20} height={20} /> : <IconeEditais width={20} height={20} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--azul-900)' }}><strong>{r.titulo}</strong> <span style={{ color: 'var(--cinza-700)' }}>{r.texto}</span></div>
                  <div style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 4 }}>{fmt(n.criadoEm)}</div>
                </div>
                {!n.lida && <span data-cy="nao-lida" aria-label={t('notificacoes.naoLida')} style={{ flexShrink: 0, width: 9, height: 9, borderRadius: 999, background: 'var(--azul-700)', marginTop: 6 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
