import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Botao, Pill } from '../../design-system/components';
import type { ProcuradorView } from '../../lib/api';

export interface ProcuradoresProps {
  procuradores: ProcuradorView[];
  /** Convida um procurador pelo identificador (e-mail/CPF). Resolve quando concluído. */
  onConvidar: (identificador: string) => Promise<void> | void;
  /** Remove (logicamente) um procurador pelo id da conta. */
  onRemover: (contaId: string) => Promise<void> | void;
  enviando?: boolean;
  removendoId?: string | null;
  erroConvite?: string | null;
}

/** Formata o ISO da data de vínculo no idioma ativo (sem hora). */
function formatarData(iso: string, lang: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang, { dateStyle: 'medium' });
}

/**
 * UC019 — Gerir Procuradores da Empresa (RN010 / AD-30). Tela do Titular: convida procuradores
 * (identificação/e-mail), vê os vínculos ativos e o rastro dos removidos (RN015) e remove.
 * Apresentacional: o container liga a sessão (empresa autenticada), a query e as mutações.
 */
export function Procuradores({ procuradores, onConvidar, onRemover, enviando = false, removendoId = null, erroConvite = null }: ProcuradoresProps) {
  const { t, i18n } = useTranslation();
  const [identificador, setIdentificador] = useState('');

  const ativos = procuradores.filter((p) => p.ativo);
  const removidos = procuradores.filter((p) => !p.ativo);

  async function submeter(e: FormEvent) {
    e.preventDefault();
    const valor = identificador.trim();
    if (!valor) return;
    await onConvidar(valor);
    setIdentificador('');
  }

  return (
    <div className="stack" data-cy="procuradores">
      <div style={{ marginBottom: 18 }}>
        <h1 className="cm-page-title">{t('procuradores.titulo')}</h1>
        <p className="cm-page-sub">{t('procuradores.subtitulo')}</p>
      </div>

      {/* Convite */}
      <Card>
        <h2 style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', margin: '0 0 12px' }}>{t('procuradores.convite.titulo')}</h2>
        <form onSubmit={submeter} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="label" htmlFor="proc-identificador">{t('procuradores.convite.identificadorLabel')}</label>
            <input
              id="proc-identificador"
              className="input"
              data-cy="proc-identificador"
              style={{ width: '100%' }}
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder={t('procuradores.convite.identificadorPlaceholder')}
              aria-label={t('procuradores.convite.identificadorLabel')}
            />
          </div>
          <Botao type="submit" variante="amber" data-cy="proc-convidar" disabled={enviando || !identificador.trim()}>
            {enviando ? t('procuradores.convite.enviando') : t('procuradores.convite.enviar')}
          </Botao>
        </form>
        {erroConvite && <p data-cy="proc-erro" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--erro)' }}>{erroConvite}</p>}
      </Card>

      {/* Lista de ativos */}
      <Card>
        <h2 style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', margin: '0 0 12px' }}>{t('procuradores.lista.titulo')}</h2>
        {ativos.length === 0 ? (
          <p data-cy="proc-vazio" style={{ margin: 0, fontSize: 14, color: 'var(--cinza-500)' }}>{t('procuradores.lista.vazio')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ativos.map((p, i) => (
              <li
                key={p.contaId}
                data-cy="proc-item"
                style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid var(--divider)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>{p.identificador}</div>
                  <div style={{ fontSize: 13, color: 'var(--cinza-500)', marginTop: 3 }}>{t('procuradores.lista.convidadoEm', { data: formatarData(p.desde, i18n.language) })}</div>
                </div>
                <Pill tom="success">{t('procuradores.lista.ativo')}</Pill>
                <Botao
                  variante="terciario"
                  data-cy="proc-remover"
                  onClick={() => onRemover(p.contaId)}
                  disabled={removendoId === p.contaId}
                >
                  {removendoId === p.contaId ? t('procuradores.lista.removendo') : t('procuradores.lista.remover')}
                </Botao>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Rastro de removidos (append-only, RN015) */}
      {removidos.length > 0 && (
        <Card>
          <h2 style={{ font: '600 15px var(--font-body)', color: 'var(--azul-900)', margin: '0 0 12px' }}>{t('procuradores.removidos.titulo')}</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {removidos.map((p, i) => (
              <li
                key={p.contaId}
                data-cy="proc-removido"
                style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--divider)', color: 'var(--cinza-500)' }}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{p.identificador}</span>
                <Pill tom="warn">{t('procuradores.lista.removido')}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
