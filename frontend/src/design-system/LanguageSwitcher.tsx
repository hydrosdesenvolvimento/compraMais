import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/languages';

/**
 * Seletor de idioma (pt-BR · en · es). Persiste a escolha via i18next-browser-languagedetector
 * (localStorage). Usado na topbar do AppShell e na tela de autenticação.
 */
export function LanguageSwitcher({ variante = 'claro' }: { variante?: 'claro' | 'escuro' }) {
  const { i18n, t } = useTranslation();
  const atual = LANGUAGES.find((l) => i18n.resolvedLanguage === l.code)?.code ?? 'pt-BR';
  const escuro = variante === 'escuro';

  return (
    <label className="cm-langswitch" data-variante={variante} title={t('common.language.label')}>
      <span className="cm-visually-hidden">{t('common.language.aria')}</span>
      <select
        data-cy="idioma"
        aria-label={t('common.language.aria')}
        value={atual}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        style={{
          appearance: 'none', border: '1px solid var(--border)', borderRadius: 8,
          padding: '7px 30px 7px 12px', font: '600 13px var(--font-body)', cursor: 'pointer',
          background: escuro ? 'rgba(255,255,255,0.08)' : '#fff',
          color: escuro ? '#fff' : 'var(--azul-900)',
          borderColor: escuro ? 'rgba(255,255,255,0.25)' : 'var(--border)',
        }}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} style={{ color: 'var(--azul-900)' }}>{l.short} · {l.label}</option>
        ))}
      </select>
    </label>
  );
}
