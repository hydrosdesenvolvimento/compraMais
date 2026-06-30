import { cores, raio, foco } from './tokens';

/** Componentes base do design system (T038). Acessibilidade: foco visível âmbar (e-MAG/WCAG 2.1 AA). */

export function Botao({ variante = 'primario', ...props }: { variante?: 'primario' | 'secundario' | 'terciario' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const fundo = variante === 'primario' ? cores.azul700 : variante === 'secundario' ? cores.cinza700 : 'transparent';
  const cor = variante === 'terciario' ? cores.azul700 : cores.branco;
  return <button {...props} style={{ background: fundo, color: cor, borderRadius: raio.base, padding: '10px 18px', border: 'none', ...props.style }} />;
}

export function Tag({ status, children }: { status: 'ativa' | 'pendente' | 'bloqueado'; children: React.ReactNode }) {
  const cor = status === 'ativa' ? '#1f9d55' : status === 'pendente' ? cores.acentoAmbar : cores.erro;
  return <span style={{ background: cor, color: cores.branco, borderRadius: raio.pill, padding: '2px 10px', fontSize: 12 }}>{children}</span>;
}

/** Barra de acessibilidade: alto contraste, ajuste de fonte (a lógica de toggle vai no app). */
export function BarraAcessibilidade() {
  return (
    <div role="region" aria-label="Acessibilidade" style={{ outlineOffset: foco.offset }}>
      <button aria-label="Alto contraste">A</button>
      <button aria-label="Aumentar fonte">A+</button>
      <button aria-label="Diminuir fonte">A-</button>
    </div>
  );
}

// Estilo global de foco visível (aplicar no CSS base): *:focus-visible { outline: 3px solid #FFB300; outline-offset: 3px }
