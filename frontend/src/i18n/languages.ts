/** Idiomas suportados pela plataforma. pt-BR é o padrão (fonte); en e es são traduções. */
export const LANGUAGES = [
  { code: 'pt-BR', label: 'Português', short: 'PT' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'es', label: 'Español', short: 'ES' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'pt-BR';
export const SUPPORTED_LANGUAGES: LanguageCode[] = LANGUAGES.map((l) => l.code);
