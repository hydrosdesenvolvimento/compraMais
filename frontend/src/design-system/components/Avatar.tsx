/** Avatar circular com iniciais. */
export function Avatar({ iniciais, size = 40, className = '' }: { iniciais: string; size?: number; className?: string }) {
  return <span className={`avatar ${className}`.trim()} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>{iniciais}</span>;
}
