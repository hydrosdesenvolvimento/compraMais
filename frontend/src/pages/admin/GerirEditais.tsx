import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Card, Botao, Campo } from '../../design-system/components';
import { IconeEditais } from '../../design-system/icons';

/** Mapeia a situação do edital para o tom da pill de status (design system). */
const PILL_SITUACAO: Record<string, string> = {
  rascunho: 'pill-warn',
  publicado: 'pill-success',
  encerrado: 'pill-info',
};

/**
 * Gestão de editais (US1 / Painel Admin). Consulta (Query, QBE por situação), criação (TanStack Form),
 * publicar/encerrar (Mutations com invalidação). Invariante 1 Edital = 1 Secretaria (backend — FR-002).
 */
export function GerirEditais({ secretariaId }: { secretariaId: string }) {
  const { t } = useTranslation();
  const [situacaoFiltro, setSituacaoFiltro] = useState('publicado');
  const qc = useQueryClient();
  const chave = ['gestao-editais', secretariaId] as const;

  const { data: editais = [], isLoading } = useQuery({ queryKey: [...chave, situacaoFiltro], queryFn: () => api.gestaoEditais(secretariaId, situacaoFiltro) });
  const invalidar = () => qc.invalidateQueries({ queryKey: chave });

  const criar = useMutation({
    mutationFn: (v: { objeto: string; cnae: string; quantitativos: number; prazo: string }) => api.criarEdital({ secretariaId, objeto: v.objeto, cnaesAlvo: v.cnae.split(',').map((c) => c.trim()).filter(Boolean), quantitativos: v.quantitativos, prazoVigencia: v.prazo }),
    onSuccess: () => { form.reset(); void invalidar(); },
  });
  const publicar = useMutation({ mutationFn: (id: string) => api.publicarEdital(id), onSuccess: () => void invalidar() });
  const encerrar = useMutation({ mutationFn: (id: string) => api.encerrarEdital(id), onSuccess: () => void invalidar() });

  const form = useForm({
    defaultValues: { objeto: '', cnae: '', quantitativos: 1, prazo: '' },
    onSubmit: async ({ value }) => { await criar.mutateAsync(value); },
  });

  const situacoes = [
    { valor: 'rascunho', rotulo: t('admin.gerirEditais.situacaoRascunho') },
    { valor: 'publicado', rotulo: t('admin.gerirEditais.situacaoPublicado') },
    { valor: 'encerrado', rotulo: t('admin.gerirEditais.situacaoEncerrado') },
  ];

  return (
    <div className="stack">
      <div className="cm-page-head">
        <div>
          <h1 className="cm-page-title">{t('admin.gerirEditais.titulo')}</h1>
          <p className="cm-page-sub">{t('admin.gerirEditais.subtitulo')}</p>
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ display: 'inline-grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, background: 'var(--azul-50)', color: 'var(--azul-700)', flexShrink: 0 }}>
            <IconeEditais width={20} height={20} />
          </span>
          <div>
            <h2 style={{ fontSize: 16, color: 'var(--azul-900)' }}>{t('admin.gerirEditais.formTitulo')}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--cinza-500)' }}>{t('admin.gerirEditais.formSubtitulo')}</p>
          </div>
        </div>

        <form data-cy="form-edital" onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(); }} style={{ maxWidth: 620 }}>
          <form.Field name="objeto">{(f) => (
            <Campo label={t('admin.gerirEditais.objetoLabel')} htmlFor="edital-objeto">
              <input id="edital-objeto" data-cy="objeto" className="input" placeholder={t('admin.gerirEditais.objetoPlaceholder')} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />
            </Campo>
          )}</form.Field>

          <form.Field name="cnae">{(f) => (
            <Campo label={t('admin.gerirEditais.cnaeLabel')} htmlFor="edital-cnae">
              <input id="edital-cnae" data-cy="cnae" className="input" placeholder={t('admin.gerirEditais.cnaePlaceholder')} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />
              <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: 'var(--cinza-500)' }}>{t('admin.gerirEditais.cnaeAjuda')}</span>
            </Campo>
          )}</form.Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <form.Field name="quantitativos">{(f) => (
              <Campo label={t('admin.gerirEditais.quantitativosLabel')} htmlFor="edital-quantitativos">
                <input id="edital-quantitativos" data-cy="quantitativos" className="input" type="number" min={1} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))} />
              </Campo>
            )}</form.Field>
            <form.Field name="prazo">{(f) => (
              <Campo label={t('admin.gerirEditais.prazoLabel')} htmlFor="edital-prazo">
                <input id="edital-prazo" data-cy="prazo" className="input" type="date" value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} />
              </Campo>
            )}</form.Field>
          </div>

          <Botao data-cy="criar" type="submit" disabled={criar.isPending}>{t('admin.gerirEditais.criar')}</Botao>
        </form>
      </Card>

      <div className="cm-page-head" style={{ marginBottom: 0, alignItems: 'center' }}>
        <h2 style={{ fontSize: 17, color: 'var(--azul-900)' }}>{t('admin.gerirEditais.listaTitulo')}</h2>
        <div role="tablist" aria-label={t('admin.gerirEditais.filtrarSituacao')} data-cy="filtro-situacao" style={{ display: 'inline-flex', gap: 4, background: 'var(--cinza-100)', padding: 4, borderRadius: 999 }}>
          {situacoes.map((s) => {
            const ativo = s.valor === situacaoFiltro;
            return (
              <button
                key={s.valor}
                type="button"
                role="tab"
                aria-selected={ativo}
                data-cy={`filtro-${s.valor}`}
                onClick={() => setSituacaoFiltro(s.valor)}
                className="btn"
                style={{
                  padding: '7px 16px', borderRadius: 999, fontSize: 13,
                  background: ativo ? '#fff' : 'transparent',
                  color: ativo ? 'var(--azul-700)' : 'var(--cinza-500)',
                  boxShadow: ativo ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {s.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <p data-cy="carregando">{t('admin.gerirEditais.carregando')}</p>
      ) : editais.length === 0 ? (
        <div data-cy="estado-vazio" className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>
          <div style={{ display: 'inline-grid', placeItems: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--azul-50)', color: 'var(--azul-700)', marginBottom: 12 }}>
            <IconeEditais width={24} height={24} />
          </div>
          <div style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', marginBottom: 4 }}>{t('admin.gerirEditais.vazioTitulo')}</div>
          <div style={{ fontSize: 13.5 }}>{t('admin.gerirEditais.vazioDica')}</div>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {editais.map((e) => (
            <li key={e.id} data-cy="edital" className="card" style={{ padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 14.5, color: 'var(--cinza-900)', lineHeight: 1.5, marginBottom: 6 }}>{e.objeto}</div>
                <span className={`pill ${PILL_SITUACAO[e.situacao] ?? 'pill-info'}`}>
                  {t(`admin.gerirEditais.situacao${e.situacao.charAt(0).toUpperCase()}${e.situacao.slice(1)}`)}
                </span>
              </div>
              {e.situacao === 'rascunho' && <Botao data-cy="publicar" onClick={() => publicar.mutate(e.id)} disabled={publicar.isPending}>{t('admin.gerirEditais.publicar')}</Botao>}
              {e.situacao === 'publicado' && <Botao data-cy="encerrar" variante="secundario" onClick={() => encerrar.mutate(e.id)} disabled={encerrar.isPending}>{t('admin.gerirEditais.encerrar')}</Botao>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
