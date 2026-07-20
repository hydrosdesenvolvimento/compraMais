import { useTranslation } from 'react-i18next';
import { Card } from '../../design-system/components';

/**
 * Placeholder das telas do Painel Admin ainda não implementadas (Fornecedores, Distribuição, Cadastro de
 * Reserva, Setores Industriais, etc.). Mantém o menu navegável — cada tela nova entra no catálogo/perfis
 * antes de ganhar sua UI real. `tituloKey` reaproveita o rótulo i18n do próprio item de menu.
 */
export function EmConstrucao({ tituloKey }: { tituloKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="stack">
      <div>
        <h1 className="page-title">{t(tituloKey)}</h1>
        <p className="page-sub">{t('admin.emConstrucao.subtitulo')}</p>
      </div>
      <Card>
        <p data-cy="em-construcao" style={{ color: 'var(--texto-suave)' }}>{t('admin.emConstrucao.corpo')}</p>
      </Card>
    </div>
  );
}
