import { useEffect, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type StatusElegivel } from '../../lib/api';

/**
 * Painel Admin · "Credenciamento em Edital" (Operação — CPL/SMGA). Dado um edital ABERTO, lista os
 * fornecedores elegíveis (filtro CNAE RN001) com regularidade (RN002) e a situação do credenciamento
 * do par. Somente leitura — fiel a `spec/Prototipo/painel-administrativo.html` (view `isCredenciamento`).
 *
 * O protótipo mostra um único edital; como a operação precisa escolher qual, um seletor de editais
 * abertos (`editaisOperacao('publicado')`) governa o card + a lista (`editaisElegiveis`). Placeholders
 * honestos: as pills PGM/SICAF refletem o mesmo sinal `regular` (o domínio tem uma única fonte de
 * inadimplência); a capacidade só existe quando há credenciamento (declarada por edital — RN005); o
 * badge "Fornecedor"/distribuição (Épico 5) fica fora — estados possíveis: Credenciado/Requerente/Elegível.
 */

/** 7 dígitos da subclasse → máscara Receita DDDD-D/DD (ex.: 1412601 → 1412-6/01). */
function formatarCnae(codigo: string): string {
  const d = codigo.replace(/\D/g, '');
  return d.length === 7 ? `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5, 7)}` : codigo;
}

const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, font: '600 12.5px var(--font-body)', whiteSpace: 'nowrap' };
const chip: CSSProperties = { ...pill, padding: '6px 14px' };

/** Tom do badge de situação do fornecedor perante o edital, nas cores do protótipo. */
function tomStatus(status: StatusElegivel): CSSProperties {
  if (status === 'credenciado') return { background: 'var(--sucesso-bg)', color: 'var(--sucesso)' };
  if (status === 'requerente') return { background: 'var(--atencao-bg)', color: '#8A5410' };
  return { background: 'var(--cinza-100, #eef1f5)', color: 'var(--cinza-500)' }; // elegivel (neutro)
}

export function CredenciamentoEmEdital() {
  const { t } = useTranslation();
  const [editalId, setEditalId] = useState<string>('');

  const { data: editais = [], isLoading: carregandoEditais } = useQuery({
    queryKey: ['credenciamento-editais-abertos'],
    queryFn: () => api.editaisOperacao('publicado'),
  });

  // Default = primeiro edital aberto assim que a lista chega (sem sobrescrever a escolha do operador).
  useEffect(() => {
    if (!editalId && editais.length > 0) setEditalId(editais[0].id);
  }, [editais, editalId]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['credenciamento-elegiveis', editalId],
    queryFn: () => api.editaisElegiveis(editalId),
    enabled: !!editalId,
  });

  const situacaoEdital = data?.edital.situacao ?? 'publicado';

  return (
    <div className="stack" data-cy="admin-credenciamento-edital">
      <div>
        <h1 className="page-title">{t('admin.credenciamentoEdital.titulo')}</h1>
      </div>

      {carregandoEditais ? (
        <p data-cy="carregando-editais" className="page-sub">{t('admin.credenciamentoEdital.carregando')}</p>
      ) : editais.length === 0 ? (
        <div data-cy="sem-editais" className="card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
          {t('admin.credenciamentoEdital.semEditais')}
        </div>
      ) : (
        <>
          <label style={{ display: 'block', maxWidth: 520 }}>
            <span style={{ font: '600 11px var(--font-body)', letterSpacing: '.06em', color: 'var(--cinza-500)', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>
              {t('admin.credenciamentoEdital.seletorLabel')}
            </span>
            <select className="input" data-cy="seletor-edital" value={editalId} onChange={(e) => setEditalId(e.target.value)} style={{ width: '100%' }}>
              {editais.map((ed) => (
                <option key={ed.id} value={ed.id}>{ed.numero} — {ed.objeto}</option>
              ))}
            </select>
          </label>

          {/* Card do edital selecionado */}
          <div className="card" data-cy="card-edital" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ font: '600 13px var(--font-body)', color: 'var(--azul-700)' }}>{data?.edital.numero ?? '—'}</div>
              <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--azul-900)', margin: '3px 0 4px' }}>{data?.edital.objeto ?? ''}</div>
              <div style={{ fontSize: 13, color: 'var(--cinza-500)' }}>
                {data?.edital.secretariaSigla ?? '—'}
                {data && data.edital.cnaesAlvo.length > 0 && ` · ${t('admin.credenciamentoEdital.cnaeExigido', { cnae: data.edital.cnaesAlvo.map(formatarCnae).join(', ') })}`}
              </div>
            </div>
            <span data-cy="chip-situacao" style={{ ...chip, background: 'var(--azul-50)', color: 'var(--azul-700)' }}>
              {t(`admin.credenciamentoEdital.situacaoEdital.${situacaoEdital}`, { defaultValue: situacaoEdital })}
            </span>
          </div>

          <div style={{ font: '600 13.5px var(--font-body)', color: 'var(--azul-900)' }}>
            {t('admin.credenciamentoEdital.elegiveisTitulo')}{' '}
            <span style={{ color: 'var(--cinza-400)', fontWeight: 500 }}>{t('admin.credenciamentoEdital.elegiveisFiltro')}</span>
          </div>

          {isError ? (
            <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.credenciamentoEdital.erroCarregar')}</p>
          ) : isLoading || !data ? (
            <p data-cy="carregando" className="page-sub">{t('admin.credenciamentoEdital.carregando')}</p>
          ) : data.elegiveis.length === 0 ? (
            <div data-cy="vazio" className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
              <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.credenciamentoEdital.vazioTitulo')}</div>
              <div style={{ fontSize: 13.5 }}>{t('admin.credenciamentoEdital.vazioDica')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.elegiveis.map((f) => (
                <div key={f.fornecedorId} data-cy="item-elegivel" data-status={f.status} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--azul-900)' }}>{f.nome}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--cinza-500)', margin: '3px 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                      <span data-cy="cnpj">{f.cnpj}</span>
                      {' · '}
                      <span data-cy="capacidade">{f.capacidade != null ? t('admin.credenciamentoEdital.capacidade', { cap: f.capacidade }) : t('admin.credenciamentoEdital.semCapacidade')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      <span data-cy="pill-pgm" style={{ ...pill, ...tomRegular(f.regular) }}>{t('admin.credenciamentoEdital.pills.pgm', { estado: rotuloRegular(t, f.regular) })}</span>
                      <span data-cy="pill-sicaf" style={{ ...pill, ...tomRegular(f.regular) }}>{t('admin.credenciamentoEdital.pills.sicaf', { estado: rotuloRegular(t, f.regular) })}</span>
                      <span style={{ ...pill, background: 'var(--azul-50)', color: 'var(--azul-700)' }}>{t('admin.credenciamentoEdital.pills.cnaeCompativel')}</span>
                    </div>
                  </div>
                  <span data-cy="badge-status" style={{ ...pill, ...tomStatus(f.status) }}>
                    {t(`admin.credenciamentoEdital.status.${f.status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Cor da pill de regularidade (RN002): verde regular / vermelho irregular. */
function tomRegular(regular: boolean): CSSProperties {
  return regular
    ? { background: 'var(--sucesso-bg)', color: 'var(--sucesso)' }
    : { background: 'var(--erro-bg)', color: 'var(--erro-700)' };
}
function rotuloRegular(t: (k: string) => string, regular: boolean): string {
  return t(`admin.credenciamentoEdital.regularidade.${regular ? 'regular' : 'irregular'}`);
}
