/** Stepper horizontal (1 Capacidade — 2 Documentos — ...). Os rótulos vêm traduzidos (i18n) do chamador. */
export function Stepper({ passos, ativo }: { passos: string[]; ativo: number }) {
  return (
    <div className="stepper" role="list">
      {passos.map((p, i) => (
        <span key={p} style={{ display: 'contents' }}>
          <span className={`step ${i === ativo ? 'active' : ''}`} role="listitem">
            <span className="step-num">{i + 1}</span>{p}
          </span>
          {i < passos.length - 1 && <span className="step-sep" aria-hidden />}
        </span>
      ))}
    </div>
  );
}
