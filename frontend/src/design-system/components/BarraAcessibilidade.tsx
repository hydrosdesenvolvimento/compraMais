import { useTranslation } from 'react-i18next';

/** Barra de acessibilidade (e-MAG): alto contraste, ajuste de fonte (lógica de toggle no app). */
export function BarraAcessibilidade() {
  const { t } = useTranslation();
  return (
    <div role="region" aria-label={t('common.a11y.region')} style={{ display: 'inline-flex', gap: 4 }}>
      <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} aria-label={t('common.a11y.highContrast')}>A</button>
      <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} aria-label={t('common.a11y.increaseFont')}>A+</button>
      <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} aria-label={t('common.a11y.decreaseFont')}>A-</button>
    </div>
  );
}
