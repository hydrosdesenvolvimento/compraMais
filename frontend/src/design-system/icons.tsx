/** Ícones do design system (SVG inline, estilo Lucide — stroke arredondado). Paths alinhados ao mockup. */
import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  ...props,
});

/* ---- Navegação (paths exatos do mockup) ---- */
export const IconeInicio = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 21h18" /><path d="M5 21V8l7-5 7 5v13" /><path d="M9 21v-6h6v6" /></svg>);
export const IconeEditais = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>);
export const IconeCredenciamentos = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>);
export const IconeDocumentos = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>);
export const IconeDemandas = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M16.5 9.4 7.5 4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>);

/* ---- Topbar / shell ---- */
export const IconeSino = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>);
export const IconeBusca = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)} strokeWidth={2}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
export const IconeMenu = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)} strokeWidth={1.9}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>);
export const IconeChevron = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)} strokeWidth={2}><polyline points="6 9 12 15 18 9" /></svg>);
export const IconePredio = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 21h18M5 21V8l7-4 7 4v13" /><path d="M9 21v-5h6v5M9 11h.01M15 11h.01" /></svg>);
export const IconeUsuario = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);
export const IconeSair = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>);

/* ---- Ações / status ---- */
export const IconeSeta = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)} strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>);
export const IconeVoltar = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)} strokeWidth={2}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>);
export const IconeAlerta = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
export const IconeRelogio = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
export const IconeCheck = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)} strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>);
export const IconeCheckCirculo = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>);
export const IconeFechar = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)} strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
export const IconeFiltro = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>);
/** Tela Única de Contestação/Regularização (UC016) — escudo com alerta: pendência a regularizar. */
export const IconeContestacao = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>);
export const IconeDownload = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);
export const IconeUpload = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>);
export const IconeSync = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>);
export const IconeCadeado = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
export const IconeCamera = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>);
export const IconeInfo = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>);
/** Olho — "ver detalhes" na lista administrativa. */
export const IconeOlho = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>);
/** Lápis — "editar" na lista administrativa. */
export const IconeLapis = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>);
/** Círculo com barra — ação "bloquear" (RN002). */
export const IconeBloquear = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>);
/** Botão liga/desliga — alterna a situação (ativar/inativar) de um item de catálogo. */
export const IconePower = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>);
/** Mais (+) — ação de adicionar item/peça em listas. */
export const IconeMais = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
/** Lixeira — exclusão física (ex.: material inativo sem vínculo em /admin/catalogos). */
export const IconeLixeira = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>);
/** Setas de ordenação — botão "Ordenar" da toolbar. */
export const IconeOrdenar = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 6h11M3 12h7M3 18h4" /><path d="m17 8 4-4 4 4M21 4v12" transform="translate(-4 2)" /></svg>);
