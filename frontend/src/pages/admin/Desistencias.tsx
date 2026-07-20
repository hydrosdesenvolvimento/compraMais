import { type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

/**
 * Painel Admin · "Desistências" (Operação — SMGA/CPL). Registro auditável dos fornecedores titulares
 * que declinaram de cotas atribuídas: tinham cota na matriz vigente e o credenciamento deixou de estar
 * `aceito` (UC009 fluxo A1 / RF006 / RN004 / AD-25). É o espelho do Cadastro de Reserva — quando um
 * titular desiste, o próximo da fila de reserva é acionado. Fiel a `spec/Prototipo/painel-administrativo.html`
 * (view `isDesistencias`): cabeçalho + estado vazio azul (check-circle). Somente leitura.
 */

const chipDesistencia: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 999,
  font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap', background: 'var(--erro-bg)', color: 'var(--erro-700)',
};

export function Desistencias() {
  const { t, i18n } = useTranslation();
  const { data: lista = [], isLoading, isError } = useQuery({
    queryKey: ['desistencias'],
    queryFn: () => api.desistencias(),
  });
  const numero = (n: number): string => new Intl.NumberFormat(i18n.language).format(n);

  return (
    <div className="stack" data-cy="admin-desistencias">
      <div>
        <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.desistencias.eyebrow')}</div>
        <h1 className="page-title">{t('admin.desistencias.titulo')}</h1>
        <p className="page-sub">{t('admin.desistencias.subtitulo')}</p>
      </div>

      {isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro)' }}>{t('admin.desistencias.erroCarregar')}</p>
      ) : isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.desistencias.carregando')}</p>
      ) : lista.length === 0 ? (
        // Estado vazio do protótipo: círculo azul com check + explicação da regra RN004 (acionamento da reserva).
        <div data-cy="vazio" className="card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--azul-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--azul-600)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div style={{ font: '600 16px var(--font-body)', color: 'var(--azul-900)' }}>{t('admin.desistencias.vazioTitulo')}</div>
          <div style={{ fontSize: 13.5, color: 'var(--cinza-500)', marginTop: 5, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>{t('admin.desistencias.vazioDica')}</div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {lista.map((d) => (
            <div key={`${d.editalId}:${d.fornecedorId}`} data-cy="linha-desistencia" className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--azul-900)' }}>{d.nome}</div>
                <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 2 }}>{d.numero} — {d.objeto}</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginRight: 6 }}>{t('admin.desistencias.cota', { cota: numero(d.cota) })}</div>
              <span style={chipDesistencia}>{t('admin.desistencias.chip')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
