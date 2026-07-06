/**
 * Design System — tokens (Prefeitura de Rio Branco / Portal do Fornecedor "Compra Mais").
 * Paleta navy institucional + âmbar de ação, Poppins. Valores alinhados ao design de referência
 * (spec/AI-UI-Design). Acessibilidade: foco visível âmbar 3px; meta e-MAG/WCAG 2.1 AA.
 */
export const cores = {
  // Navy institucional (do mais escuro ao claro)
  azul900: '#0A2A52',
  azul800: '#0E3A6E',
  azul700: '#14467F', // navy primária (textos/headers, botão primário)
  azul600: '#1E5AA0',
  azul500: '#3B82C4',
  azul300: '#5B9BD5', // azul claro de destaque
  azul100: '#CCE0F0', // avatar / superfícies suaves
  azul50: '#E8F0FB', // item de menu ativo
  // Âmbar (ação)
  acentoAmbar: '#F2B705',
  ambarEscuro: '#8A5410', // texto/ícone sobre âmbar
  ambarBg: '#FFF4D6',
  // Neutros / superfícies
  bgPage: '#F4F4F5',
  branco: '#FFFFFF',
  borda: '#E6EBF1',
  divisor: '#F0F3F7',
  cinza200: '#E2E7EE',
  cinza400: '#8A8C8E',
  cinza700: '#4B4B4B',
  texto: '#1F2A44', // headings (navy-tinta)
  textoSuave: '#667085', // corpo / secundário
  tinta: '#2E2F30',
  // Status
  sucesso: '#2E9E5B',
  sucessoBg: '#E6F4EA',
  erro: '#C0362C',
  erroBg: '#FBEAE8',
  info: '#14467F',
} as const;

export const tipografia = { familia: "'Poppins', system-ui, sans-serif" } as const;
export const espacamento = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28 } as const; // px
export const raio = { sm: 8, base: 12, lg: 14, pill: 999 } as const; // px
export const foco = { outline: `3px solid ${cores.acentoAmbar}`, offset: '2px' } as const;
