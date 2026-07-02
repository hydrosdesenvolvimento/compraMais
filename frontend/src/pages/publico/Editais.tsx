import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { IconeBusca, IconeFiltro, IconeSeta } from '../../design-system/icons';

/** Campos extras opcionais que a API pode ou não trazer além de { id, objeto }. */
type EditalExtra = {
  numero?: string;
  secretaria?: string;
  prazo?: string;
};

/**
 * Vitrine de Editais (UX-DR3) — apenas editais compatíveis com os CNAEs da empresa.
 * Estado vazio orientado. Dados via TanStack Query. Busca client-side pelo objeto.
 */
export function Editais() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: editais = [], isLoading } = useQuery({ queryKey: ['editais'], queryFn: api.editaisCompativeis });
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return editais;
    return editais.filter((e) => e.objeto.toLowerCase().includes(termo) || (((e as EditalExtra).numero ?? '').toLowerCase().includes(termo)));
  }, [editais, busca]);

  return (
    <div className="stack">
      <div className="cm-page-head">
        <h1 className="cm-page-title" style={{ fontSize: 22, color: 'var(--azul-900)', margin: 0 }}>
          {t('editais.vitrine.titulo')}
        </h1>
        <p className="cm-page-sub" style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--cinza-500)' }}>
          {t('editais.vitrine.subtitulo')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, margin: '18px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <IconeBusca
            width={17}
            height={17}
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--cinza-400)' }}
          />
          <input
            className="input"
            aria-label={t('editais.vitrine.buscaAriaLabel')}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t('editais.vitrine.buscaPlaceholder')}
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}
        >
          <IconeFiltro width={16} height={16} />
          {t('editais.vitrine.filtros')}
        </button>
      </div>

      {isLoading ? (
        <p data-cy="carregando">{t('editais.vitrine.carregando')}</p>
      ) : filtrados.length === 0 ? (
        <div
          data-cy="estado-vazio"
          className="card"
          style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}
        >
          <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>
            {busca.trim()
              ? t('editais.vitrine.vazioBuscaTitulo')
              : t('editais.vitrine.vazioTitulo')}
          </div>
          <div style={{ fontSize: 13.5 }}>
            {busca.trim() ? t('editais.vitrine.vazioBuscaDica') : t('editais.vitrine.vazioDica')}
          </div>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map((e) => {
            const extra = e as EditalExtra;
            return (
              <li
                key={e.id}
                data-cy="edital-item"
                data-compativel="true"
                className="card"
                style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    {extra.numero && (
                      <span style={{ font: '600 14px var(--font-body)', color: 'var(--azul-700)', whiteSpace: 'nowrap' }}>
                        {extra.numero}
                      </span>
                    )}
                    {extra.secretaria && (
                      <span
                        style={{
                          font: '600 10.5px var(--font-body)',
                          letterSpacing: '.05em',
                          color: 'var(--azul-800)',
                          background: 'var(--azul-100)',
                          padding: '3px 9px',
                          borderRadius: 6,
                        }}
                      >
                        {extra.secretaria}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--cinza-900)', lineHeight: 1.5 }}>{e.objeto}</div>
                </div>

                {extra.prazo && (
                  <span
                    className="pill"
                    style={{
                      background: 'var(--atencao-bg)',
                      color: 'var(--ambar-700)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {extra.prazo}
                  </span>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate({ to: '/credenciamento' })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
                >
                  {t('editais.vitrine.iniciar')}
                  <IconeSeta width={15} height={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
