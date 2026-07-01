import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { IconeBusca, IconeFiltro, IconeSeta } from '../../design-system/icons';

/** Meus Credenciamentos (US3 / FR-012) — acompanha credenciamentos e próximos passos. Query. */
export function Contestacao({ fornecedorId }: { fornecedorId: string }) {
  const { data: pendencias = [], isLoading } = useQuery({ queryKey: ['pendencias', fornecedorId], queryFn: () => api.pendencias(fornecedorId) });

  const cabecalho = (
    <div style={{ marginBottom: 18 }}>
      <h1 className="cm-page-title">Meus Credenciamentos</h1>
      <p className="cm-page-sub">Acompanhe seus credenciamentos em editais e continue o que estiver em rascunho.</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="stack">
        {cabecalho}
        <p data-cy="carregando" style={{ color: 'var(--cinza-500)' }}>Carregando…</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {cabecalho}

      {/* Busca + filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', color: 'var(--cinza-400)' }}>
            <IconeBusca width={17} height={17} />
          </span>
          <input
            className="input"
            placeholder="Buscar por número ou título do edital…"
            style={{ width: '100%', paddingLeft: 38 }}
          />
        </div>
        <button className="btn" type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <IconeFiltro width={16} height={16} />
          Filtros
        </button>
      </div>

      {/* Lista */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xs)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho da lista */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid var(--divider)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--cinza-500)' }}>Exibindo por página: 10</span>
          <span style={{ fontSize: 13, color: 'var(--cinza-500)' }}>Pág 1 de 1</span>
        </div>

        {pendencias.length === 0 ? (
          <div data-cy="sem-pendencias" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
            <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 6 }}>
              Nenhum credenciamento encontrado.
            </div>
            <div style={{ fontSize: 13.5 }}>
              Acesse um edital disponível e clique em “Iniciar Credenciamento” para começar.
            </div>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {pendencias.map((p, i) => (
              <li
                key={i}
                data-cy="pendencia"
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  padding: '16px 18px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)' }}>{p.tipo}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--cinza-500)', marginTop: 3 }}>{p.motivo ?? '—'}</div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 8,
                      fontSize: 13,
                      font: '600 13px var(--font-body)',
                      color: 'var(--azul-700)',
                    }}
                  >
                    <IconeSeta width={14} height={14} />
                    {p.proximoPasso}
                  </div>
                </div>
                <span className="pill pill-warn" style={{ flexShrink: 0 }}>rascunho</span>
              </li>
            ))}
          </ul>
        )}

        {/* Rodapé com paginação */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderTop: '1px solid var(--divider)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--cinza-500)' }}>
            {pendencias.length} {pendencias.length === 1 ? 'credenciamento' : 'credenciamentos'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn"
              type="button"
              disabled
              style={{ minWidth: 36, padding: '6px 12px' }}
            >
              Pág 1 de 1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
