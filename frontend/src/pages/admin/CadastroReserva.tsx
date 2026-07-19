import { type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

/**
 * Painel Admin · "Cadastro de Reserva" (Operação — SMGA/CPL). Fila cronológica global dos fornecedores
 * retardatários: aptos (credenciamento aceito) que se credenciaram **após** a distribuição inicial e
 * por isso ficaram fora da matriz vigente (2ª Demanda, UC009 / RF006 / RN004). A distribuição já feita
 * permanece intacta — esta tela só estrutura quem será acionado por substituição, em ordem cronológica
 * (isonomia LC 123). Fiel a `spec/Prototipo/painel-administrativo.html` (view `isReserva`): cabeçalho +
 * aviso "Fila de reserva" + lista numerada (posição · fornecedor · edital/objeto · capacidade · chip).
 * Somente leitura.
 */

const chipReserva: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 999,
  font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap', background: 'var(--atencao-bg)', color: '#8A5410',
};

const badge: CSSProperties = {
  width: 38, height: 38, borderRadius: '50%', background: 'var(--atencao-bg)', color: '#8A5410',
  display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 15px var(--font-body)', flexShrink: 0,
};

export function CadastroReserva() {
  const { t, i18n } = useTranslation();
  const { data: fila = [], isLoading, isError } = useQuery({
    queryKey: ['cadastro-reserva'],
    queryFn: () => api.cadastroReserva(),
  });
  const numero = (n: number): string => new Intl.NumberFormat(i18n.language).format(n);

  return (
    <div className="stack" data-cy="admin-cadastro-reserva">
      <div>
        <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.reserva.eyebrow')}</div>
        <h1 className="page-title">{t('admin.reserva.titulo')}</h1>
        <p className="page-sub">{t('admin.reserva.subtitulo')}</p>
      </div>

      {/* Aviso "Fila de reserva" — explica a regra RN004 (não altera cotas já distribuídas). */}
      <div style={{ display: 'flex', gap: 12, background: 'var(--atencao-bg)', border: '1px solid var(--atencao)', borderRadius: 12, padding: '15px 18px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A5410" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#8A5410' }}>
          <strong>{t('admin.reserva.avisoTitulo')}</strong> {t('admin.reserva.avisoTexto')}
        </div>
      </div>

      {isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.reserva.erroCarregar')}</p>
      ) : isLoading ? (
        <p data-cy="carregando" className="page-sub">{t('admin.reserva.carregando')}</p>
      ) : fila.length === 0 ? (
        <div data-cy="vazio" className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
          <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.reserva.vazioTitulo')}</div>
          <div style={{ fontSize: 13.5 }}>{t('admin.reserva.vazioDica')}</div>
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {fila.map((r) => (
            <div key={`${r.editalId}:${r.fornecedorId}`} data-cy="linha-reserva" className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={badge} data-cy="posicao" aria-label={t('admin.reserva.posicaoLabel', { posicao: r.posicao })}>{numero(r.posicao)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--azul-900)' }}>{r.nome}</div>
                <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginTop: 2 }}>{r.numero} — {r.objeto}</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', marginRight: 6 }}>{t('admin.reserva.capacidade', { cap: numero(r.teto) })}</div>
              <span style={chipReserva}>{t('admin.reserva.chip')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
