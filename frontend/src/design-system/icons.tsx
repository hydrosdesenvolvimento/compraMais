/** Ícones do design system (SVG inline, stroke 2 — estilo do design de referência). */
import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  ...props,
});

export const IconeInicio = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></svg>);
export const IconeEditais = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><path d="M9 13h7M9 17h7" /></svg>);
export const IconeCredenciamentos = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m8 12 3 3 5-6" /></svg>);
export const IconeDocumentos = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>);
export const IconeDemandas = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" /><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" /></svg>);
export const IconeSino = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>);
export const IconeBusca = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>);
export const IconeMenu = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
export const IconeChevron = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>);
export const IconeSync = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M21 12a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3M3 12a9 9 0 0 0 9 9 9 9 0 0 0 6.7-3" /><path d="M3 4v5h5M21 20v-5h-5" /></svg>);
export const IconePredio = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 21h18M5 21V8l7-4 7 4v13" /><path d="M9 21v-5h6v5M9 11h.01M15 11h.01" /></svg>);
export const IconeCadeado = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>);
export const IconeCamera = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.5" /></svg>);
export const IconeCheck = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m20 6-11 11-5-5" /></svg>);
export const IconeVoltar = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>);
