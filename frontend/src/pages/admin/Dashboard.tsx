import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';

/** Dashboard administrativo — funil de pendentes (Épico 9 / US1). Dados via TanStack Query. */
export function Dashboard() {
  const { t } = useTranslation();
  const { data: f, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.dashboardAdmin });
  if (isLoading || !f) return <p data-cy="carregando">{t('admin.dashboard.carregando')}</p>;

  const CardKpi = ({ titulo, valor }: { titulo: string; valor: number }) => (
    <div data-cy="card" className="card" style={{ minWidth: 170 }}>
      <div style={{ fontSize: 30, color: 'var(--navy-700)', fontWeight: 700 }}>{valor}</div>
      <div style={{ color: 'var(--texto-suave)' }}>{titulo}</div>
    </div>
  );
  return (
    <div className="stack">
      <div><h1 className="page-title">{t('admin.dashboard.titulo')}</h1><p className="page-sub">{t('admin.dashboard.subtitulo')}</p></div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <CardKpi titulo={t('admin.dashboard.documentosPendentes')} valor={f.documentosPendentes} />
        <CardKpi titulo={t('admin.dashboard.editaisPublicados')} valor={f.editaisPorSituacao.aberto} />
        <CardKpi titulo={t('admin.dashboard.editaisRascunho')} valor={f.editaisPorSituacao.rascunho} />
        <CardKpi titulo={t('admin.dashboard.bloqueiosAtivos')} valor={f.bloqueiosAtivos} />
      </div>
    </div>
  );
}
