import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type CotaDistribuida } from '../../lib/api';
import { obterUsuario } from '../../lib/auth';
import { IconeDemandas } from '../../design-system/icons';

/**
 * Demandas distribuídas (UC008 / Épico 5) — o fornecedor vê as cotas que o Motor de Distribuição lhe
 * atribuiu. Cada cota é o resultado do rateio determinístico limitado ao seu teto declarado (RN005);
 * o `hash` é o protocolo de reprodutibilidade da matriz (AD-24). Somente leitura — a empresa vem do
 * token (a rota `/distribuicao/minhas` resolve o fornecedor pelo JWT, AD-20).
 */
export function DemandasDistribuidas() {
  const { t } = useTranslation();
  const { data: cotas = [], isLoading } = useQuery({
    queryKey: ['distribuicao-minhas'],
    queryFn: () => api.distribuicaoMinhas(),
  });

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return (
    <div className="stack" data-cy="demandas-distribuidas">
      <div className="cm-page-head">
        <div>
          <h1 className="cm-page-title" style={{ fontSize: 22, color: 'var(--azul-900)', margin: 0 }}>
            {t('demandasDistribuidas.titulo')}
          </h1>
          <p className="cm-page-sub" style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--cinza-500)' }}>
            {t('demandasDistribuidas.subtitulo')}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p data-cy="carregando">{t('demandasDistribuidas.carregando')}</p>
      ) : cotas.length === 0 ? (
        <div data-cy="estado-vazio" className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
          <div style={{ display: 'inline-grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--azul-50)', color: 'var(--azul-700)', marginBottom: 12 }}>
            <IconeDemandas width={24} height={24} />
          </div>
          <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('demandasDistribuidas.vazioTitulo')}</div>
          <div style={{ fontSize: 13.5 }}>{t('demandasDistribuidas.vazioDica')}</div>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cotas.map((c: CotaDistribuida) => (
            <li key={c.editalId} data-cy="demanda-item" className="card" style={{ padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ font: '600 14px var(--font-body)', color: 'var(--azul-700)' }}>{c.numeroEdital ?? c.editalId}</div>
                <div style={{ fontSize: 14, color: 'var(--cinza-900)', marginTop: 4 }}>{c.objeto ?? t('demandasDistribuidas.editalRemovido')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 6 }}>
                  {t('demandasDistribuidas.geradoEm', { data: formatarData(c.geradoEm) })}
                  <span title={c.hash} style={{ marginLeft: 10, fontFamily: 'var(--font-mono, monospace)' }}>
                    {t('demandasDistribuidas.protocolo', { hash: c.hash.slice(0, 12) })}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div data-cy="cota" style={{ font: '700 26px var(--font-body)', color: 'var(--azul-900)', lineHeight: 1 }}>{c.cota}</div>
                <div style={{ fontSize: 12, color: 'var(--cinza-500)', marginTop: 4 }}>{t('demandasDistribuidas.unidades')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Container: exige empresa na sessão (a rota usa o token, mas a UI orienta quem não representa empresa). */
export function DemandasDistribuidasConectada() {
  const { t } = useTranslation();
  const empresaId = obterUsuario()?.empresaId;
  if (!empresaId) return <p data-cy="sem-empresa" style={{ color: 'var(--cinza-500)' }}>{t('demandasDistribuidas.semEmpresa')}</p>;
  return <DemandasDistribuidas />;
}
