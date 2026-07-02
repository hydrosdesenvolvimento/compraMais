import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';

/**
 * i18n da plataforma (react-i18next). pt-BR é a fonte e o fallback; en e es são traduções.
 * O idioma é detectado (localStorage → navegador) e persistido em `compramais.lang`.
 * Recursos empacotados (JSON) → carregamento síncrono, sem Suspense. Namespace único (`translation`),
 * com chaves aninhadas por área (`common.*`, `auth.*`, `inicio.*`, …).
 *
 * REGRA DO PROJETO: toda string visível ao usuário no frontend deve vir do i18n (`useTranslation`).
 * O backend responde sempre em inglês; a localização é responsabilidade do frontend.
 */
export const resources = {
  'pt-BR': { translation: ptBR },
  en: { translation: en },
  es: { translation: es },
} as const;

export const LANG_STORAGE_KEY = 'compramais.lang';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true, // 'pt', 'pt-PT' → 'pt-BR'; 'en-US' → 'en'
    // Recursos empacotados (sem backend assíncrono): inicializa de forma SÍNCRONA para que o
    // primeiro render já tenha as traduções (evita "flash" de chaves cruas como auth.signup.title).
    initImmediate: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

export default i18n;
