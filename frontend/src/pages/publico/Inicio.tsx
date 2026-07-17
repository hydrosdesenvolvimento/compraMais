import type { CSSProperties, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import { IconeAlerta, IconeRelogio, IconeSeta } from '../../design-system/icons';
import { api, type EditalItem, type DocItem, type CredenciamentoResumoView, type CatalogoItemView } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { diasAte, tomPrazo, CORES_PRAZO } from '../../lib/prazos';

const secTagStyle: CSSProperties = {
  font: '600 9.5px var(--font-body)', letterSpacing: '.06em', color: 'var(--cinza-500)',
  background: 'var(--cinza-100)', padding: '2px 7px', borderRadius: 5,
};

/**
 * Home do fornecedor (Épico 1) — dados REAIS via TanStack Query (sem mocks): perfil da empresa,
 * editais compatíveis (vitrine), documentos (KPIs/alertas) e credenciamentos em andamento. A demanda
 * distribuída depende do motor (Épico 5, ainda não ativo) → exibida como 0 com rótulo explícito.
 */
export function Inicio() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fornecedorId = obterUsuario()?.empresaId;
  const on = { enabled: !!fornecedorId };

  const perfil = useQuery({ queryKey: ['fornecedor', fornecedorId], queryFn: () => api.fornecedor(fornecedorId as string), ...on });
  const editais = useQuery({ queryKey: ['editais'], queryFn: api.editaisCompativeis, ...on });
  const documentos = useQuery({ queryKey: ['documentos', fornecedorId], queryFn: () => api.documentos(fornecedorId as string), ...on });
  const credenciamentos = useQuery({ queryKey: ['meus-credenciamentos', fornecedorId], queryFn: () => api.meusCredenciamentos(fornecedorId as string), ...on });
  const secretarias = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias') });

  const goDocs = () => navigate({ to: '/documentos' });
  const goEditais = () => navigate({ to: '/editais' });
  const goCredenciar = (editalId: string) => navigate({ to: '/credenciamento/$editalId', params: { editalId } });
  const goMeusCred = () => navigate({ to: '/contestacao' });

  if (!fornecedorId) return <Aviso texto={t('inicio.estado.semEmpresa')} />;
  if (perfil.isLoading) return <Aviso texto={t('inicio.estado.carregando')} />;
  if (perfil.isError || !perfil.data) return <Aviso texto={t('inicio.estado.erro')} tom="erro" />;

  const empresa = perfil.data;
  const listaEditais: EditalItem[] = editais.data ?? [];
  const docs: DocItem[] = documentos.data ?? [];
  const creds: CredenciamentoResumoView[] = credenciamentos.data ?? [];

  // Mapa secretariaId → sigla (fallback: nome ou o próprio id).
  const siglaDe = (secretariaId: string | null): string => {
    if (!secretariaId) return '—';
    const s = (secretarias.data as CatalogoItemView[] | undefined)?.find((x) => x.id === secretariaId);
    return s?.sigla ?? s?.nome ?? secretariaId;
  };

  // KPIs
  const totalEditais = listaEditais.length;
  const credsAndamento = creds.length; // o backend já exclui os cancelados
  const docsAprovados = docs.filter((d) => d.status === 'aprovado').length;
  const docsTotal = docs.length;

  // Alertas (derivados dos documentos reais)
  const vencidos = docs.filter((d) => d.situacao === 'expirado');
  const aVencer = docs
    .filter((d) => d.situacao === 'vigente' && d.dataValidade)
    .map((d) => ({ d, dias: diasAte(d.dataValidade as string) }))
    .filter((x) => x.dias >= 0 && x.dias <= 30)
    .sort((a, b) => a.dias - b.dias);
  const proximoVencer = aVencer[0];

  const nome = empresa.nomeFantasia?.trim() || empresa.razaoSocial;
  const cidade = empresa.endereco?.cidade ?? '—';
  const dataHoje = capitalizar(new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()));

  const editaisVisiveis = listaEditais.slice(0, 4);

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: '12.5px', color: 'var(--cinza-400)' }}>{dataHoje}</div>
          <h1 style={{ fontWeight: 600, fontSize: 22, color: 'var(--azul-900)', margin: '6px 0 3px' }}>
            {t('inicio.cabecalho.bemVindo', { nome })}
          </h1>
          <div style={{ fontSize: '13.5px', color: 'var(--cinza-500)' }}>
            {t('inicio.cabecalho.cnpjCidade', { cnpj: empresa.cnpj, cidade })}
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999,
            background: 'var(--info-bg)', border: '1px solid var(--azul-100)', color: 'var(--azul-700)',
            font: '600 12.5px var(--font-body)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--azul-600)' }} />
          {t('inicio.cabecalho.status', { status: t(`inicio.statusFornecedor.${empresa.status}`, empresa.status) })}
        </div>
      </div>

      {/* Alertas — só aparecem quando há pendência real */}
      {(vencidos.length > 0 || proximoVencer) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vencidos.length > 0 && (
            <div data-cy="alerta-vencidos" style={alertaBox('var(--erro)')}>
              <div style={alertaIcone('var(--erro-bg)', 'var(--erro-700)')}><IconeAlerta width={20} height={20} /></div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span style={{ font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>{t('inicio.alertaErro.titulo', { count: vencidos.length })}</span>
                  <span style={{ font: '600 11px var(--font-body)', color: '#fff', background: 'var(--erro)', padding: '2px 9px', borderRadius: 999 }}>{vencidos.length}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--cinza-500)', marginTop: 2 }}>
                  <Trans i18nKey="inicio.alertaErro.descricao" values={{ tipos: vencidos.map((d) => d.tipo).join(', ') }} components={{ b: <strong style={{ color: 'var(--erro-700)' }} /> }} />
                </div>
              </div>
              <button onClick={goDocs} style={botaoAlerta('var(--erro)')}>{t('inicio.alertaErro.botao')}<IconeSeta width={15} height={15} /></button>
            </div>
          )}

          {proximoVencer && (
            <div data-cy="alerta-vencer" style={alertaBox('var(--atencao)')}>
              <div style={alertaIcone('var(--atencao-bg)', '#8A5410')}><IconeRelogio width={20} height={20} /></div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>{t('inicio.alertaAtencao.titulo')}</div>
                <div style={{ fontSize: 13, color: 'var(--cinza-500)', marginTop: 2 }}>
                  <Trans
                    i18nKey="inicio.alertaAtencao.descricao"
                    values={{ tipo: proximoVencer.d.tipo, dias: proximoVencer.dias, data: formatarData(proximoVencer.d.dataValidade as string, i18n.language) }}
                    components={{ b: <strong style={{ color: '#8A5410' }} /> }}
                  />
                </div>
              </div>
              <button onClick={goDocs} style={botaoAlerta('var(--azul-700)')}>{t('inicio.alertaAtencao.botao')}<IconeSeta width={15} height={15} /></button>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="cm-grid-4" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <CardKpi titulo={t('inicio.kpis.editaisCompativeis')} valor={<span style={{ fontWeight: 600, fontSize: 26, color: 'var(--azul-900)', lineHeight: 1 }}>{totalEditais}</span>} cy="kpi-editais" />
        <CardKpi titulo={t('inicio.kpis.credenciamentosAndamento')} valor={<span style={{ fontWeight: 600, fontSize: 26, color: 'var(--azul-900)', lineHeight: 1 }}>{credsAndamento}</span>} cy="kpi-credenciamentos" />
        <CardKpi
          titulo={t('inicio.kpis.documentosAprovados')} cy="kpi-documentos"
          valor={<span style={{ fontWeight: 600, fontSize: 26, color: 'var(--azul-900)', lineHeight: 1 }}>{docsAprovados}<span style={{ fontSize: 16, color: 'var(--cinza-400)', fontWeight: 500 }}>/{docsTotal}</span></span>}
        />
        <CardKpi
          titulo={t('inicio.kpis.demandaDistribuida')} cy="kpi-demanda"
          valor={<span style={{ fontWeight: 600, fontSize: 26, color: 'var(--azul-900)', lineHeight: 1 }}>0</span>}
          rodape={<span style={{ fontSize: 11, color: 'var(--cinza-400)' }}>{t('inicio.kpis.demandaNaoAtiva')}</span>}
        />
      </div>

      {/* Painéis */}
      <div className="cm-grid-2" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Editais abertos compatíveis */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ font: '600 16px var(--font-display)', color: 'var(--azul-900)' }}>{t('inicio.painelEditais.titulo')}</div>
            <button onClick={goEditais} style={{ background: 'none', border: 'none', cursor: 'pointer', font: '600 13px var(--font-body)', color: 'var(--azul-700)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {t('inicio.painelEditais.verTodos')}<IconeSeta width={15} height={15} />
            </button>
          </div>
          {editaisVisiveis.length === 0 && <div data-cy="editais-vazio" style={{ padding: '22px 20px', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('inicio.painelEditais.vazio')}</div>}
          {editaisVisiveis.map((e) => {
            const prazo = descreverPrazo(e.prazoVigencia, t);
            return (
              <div key={e.id} data-cy="edital-item" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={secTagStyle}>{siglaDe(e.secretariaId)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-title)', marginTop: 4 }}>{e.objeto}</div>
                </div>
                {prazo && <span style={{ ...prazo.style, font: '600 11.5px var(--font-body)', padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{prazo.texto}</span>}
                <button onClick={() => goCredenciar(e.id)} style={{ padding: '9px 14px', border: '1.5px solid var(--azul-700)', borderRadius: 8, background: '#fff', color: 'var(--azul-700)', font: '600 13px var(--font-body)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t('inicio.painelEditais.iniciar')}
                </button>
              </div>
            );
          })}
          {totalEditais > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--cinza-500)' }}>{t('inicio.painelEditais.mostrando', { atual: editaisVisiveis.length, total: totalEditais })}</span>
            </div>
          )}
        </div>

        {/* Credenciamentos em andamento */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--divider)', font: '600 16px var(--font-display)', color: 'var(--azul-900)' }}>
            {t('inicio.painelCredenciamentos.titulo')}
          </div>
          {creds.length === 0 && <div data-cy="cred-vazio" style={{ padding: '22px 20px', fontSize: 13.5, color: 'var(--cinza-500)' }}>{t('inicio.painelCredenciamentos.vazio')}</div>}
          {creds.map((c) => {
            const tom = c.estado === 'aceito' ? { color: 'var(--sucesso)', background: 'var(--sucesso-bg)' } : { color: 'var(--info)', background: 'var(--info-bg)' };
            return (
              <div key={c.id} data-cy="cred-item" style={{ padding: '15px 20px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: '600 13px var(--font-body)', color: 'var(--azul-700)' }}>{siglaDe(c.secretariaId)}</span>
                  <span style={{ ...tom, font: '600 11px var(--font-body)', padding: '4px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{t(`inicio.credStatus.${c.estado}`)}</span>
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--text-title)', marginTop: 5 }}>{c.objeto ?? '—'}</div>
              </div>
            );
          })}
          <div style={{ padding: '16px 20px' }}>
            <button onClick={goMeusCred} style={{ width: '100%', padding: 10, border: '1.5px solid var(--azul-700)', borderRadius: 9, background: '#fff', color: 'var(--azul-700)', font: '600 13.5px var(--font-body)', cursor: 'pointer' }}>
              {t('inicio.painelCredenciamentos.verMeus')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Subcomponentes / helpers ---- */

function CardKpi({ titulo, valor, rodape, cy }: { titulo: string; valor: ReactNode; rodape?: ReactNode; cy: string }) {
  return (
    <div data-cy={cy} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
      <div style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{titulo}</div>
      <div style={{ marginTop: 10 }}>{valor}</div>
      {rodape && <div style={{ marginTop: 6 }}>{rodape}</div>}
    </div>
  );
}

function Aviso({ texto, tom = 'neutro' }: { texto: string; tom?: 'neutro' | 'erro' }) {
  return (
    <div className="stack" data-cy="inicio-estado">
      <div className="card">
        <p style={{ margin: 0, fontSize: 14, color: tom === 'erro' ? 'var(--erro)' : 'var(--cinza-500)' }}>{texto}</p>
      </div>
    </div>
  );
}

const alertaBox = (cor: string): CSSProperties => ({
  display: 'flex', gap: 14, alignItems: 'center', background: '#fff', border: '1px solid var(--border)',
  borderLeft: `3px solid ${cor}`, borderRadius: 12, padding: '16px 20px', flexWrap: 'wrap',
});
const alertaIcone = (bg: string, cor: string): CSSProperties => ({
  width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center',
  justifyContent: 'center', flexShrink: 0, color: cor,
});
const botaoAlerta = (bg: string): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: 'none', borderRadius: 8,
  background: bg, color: '#fff', font: '600 13.5px var(--font-body)', cursor: 'pointer', flexShrink: 0,
});

function capitalizar(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function formatarData(dataIso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${dataIso.slice(0, 10)}T00:00:00`));
}

/** Rótulo + cor do prazo de vigência do edital (urgente ≤3d, atenção ≤7d, normal acima). */
function descreverPrazo(prazoVigencia: string | null, t: (k: string, o?: Record<string, unknown>) => string): { texto: string; style: CSSProperties } | null {
  if (!prazoVigencia) return null;
  const dias = diasAte(prazoVigencia);
  if (dias < 0) return { texto: t('inicio.painelEditais.prazoEncerrado'), style: CORES_PRAZO.urgente };
  const texto = dias === 0 ? t('inicio.painelEditais.prazoHoje') : t('inicio.painelEditais.prazo', { count: dias });
  return { texto, style: CORES_PRAZO[tomPrazo(dias)] };
}
