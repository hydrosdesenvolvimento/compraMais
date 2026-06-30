/**
 * Design System — tokens (contrato de UX / RNF006 / AD-3). Paleta azul institucional da
 * Prefeitura de Rio Branco, Poppins, escala de espaçamento e raio. Compartilhado entre os 2 SPAs.
 * Acessibilidade: foco visível âmbar 3px; meta e-MAG/WCAG 2.1 AA.
 */
export const cores = {
  azul900: '#003A68',
  azul800: '#00497F',
  azul700: '#0061AE', // ação principal
  azul500: '#3385C4',
  azul300: '#9FCBEC',
  azul100: '#CCE0F0',
  azul50: '#E9F2FA',
  tinta: '#2E2F30',
  cinza700: '#4B4B4B',
  cinza400: '#8A8C8E',
  cinza200: '#E2E7EE',
  branco: '#FFFFFF',
  acentoAmbar: '#FFB300', // somente chamadas de ação / foco visível
  erro: '#C0362C',
  info: '#0061AE',
} as const;

export const tipografia = { familia: "'Poppins', system-ui, sans-serif" } as const;
export const espacamento = { xs: 8, sm: 12, md: 14, lg: 16, xl: 20 } as const; // px
export const raio = { base: 8, pill: 999 } as const; // px
export const foco = { outline: `3px solid ${cores.acentoAmbar}`, offset: '3px' } as const;
