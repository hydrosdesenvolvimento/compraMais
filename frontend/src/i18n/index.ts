import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type LanguageCode } from './languages';

/**
 * i18n da plataforma (react-i18next). pt-BR é a fonte, o PADRÃO e o fallback; en e es são traduções.
 * Recursos empacotados (JSON) → init SÍNCRONO (initImmediate: false), sem Suspense, para o primeiro
 * render já sair traduzido. Namespace único (`translation`), chaves aninhadas por área.
 *
 * Idioma inicial: escolha manual persistida em `compramais.lang` (localStorage) OU pt-BR por padrão.
 * NÃO auto-detectamos o idioma do navegador — pt-BR é sempre o padrão; a troca é ação explícita do
 * usuário no LanguageSwitcher (que persiste a escolha). Determinístico em browser e em teste.
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

/** Lê a escolha de idioma salva; cai em pt-BR quando não há escolha (ou storage indisponível). */
export function idiomaInicial(): LanguageCode {
  try {
    const salvo = localStorage.getItem(LANG_STORAGE_KEY);
    if (salvo && (SUPPORTED_LANGUAGES as string[]).includes(salvo)) return salvo as LanguageCode;
  } catch { /* ambiente sem storage */ }
  return DEFAULT_LANGUAGE;
}

/** Troca o idioma e persiste a escolha (usado pelo LanguageSwitcher). */
export function definirIdioma(code: LanguageCode): void {
  try { localStorage.setItem(LANG_STORAGE_KEY, code); } catch { /* noop */ }
  void i18n.changeLanguage(code);
}

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: idiomaInicial(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    // Códigos exatos ('pt-BR', 'en', 'es'). NÃO usar nonExplicitSupportedLngs: ele reduz 'pt-BR'→'pt'
    // na resolução, e os recursos estão sob a chave 'pt-BR' → o bundle não casaria (t() devolveria a chave).
    load: 'currentOnly',
    initImmediate: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
