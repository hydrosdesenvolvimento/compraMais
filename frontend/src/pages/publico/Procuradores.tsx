import { useState, type CSSProperties, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Botao, Pill, Avatar } from '../../design-system/components';
import { IconeUsuario } from '../../design-system/icons';
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

/** Monograma para o avatar: iniciais do e-mail/nome; para CPF (numérico) cai nos 2 primeiros dígitos. */
function iniciaisDe(identificador: string): string {
  const local = identificador.split('@')[0] ?? identificador;
  const tokens = local.split(/[^A-Za-zÀ-ÿ]+/).filter(Boolean);
  if (tokens.length >= 2) return (tokens[0][0] + tokens[1][0]).toUpperCase();
  const letras = local.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letras.length >= 2) return letras.slice(0, 2).toUpperCase();
  if (letras.length === 1) return letras.toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

/**
 * UC019 — Gerir Procuradores da Empresa (RN010 / AD-30). Tela do Titular: convida procuradores
 * (identificação/e-mail), vê os vínculos ativos e o rastro dos removidos (RN015) e remove.
 * Apresentacional: o container liga a sessão (empresa autenticada), a query e as mutações.
 * Visual alinhado ao design do painel administrativo (`spec/Prototipo/painel-administrativo.html`):
 * cartão com cabeçalho de ícone, linhas com monograma, contador de seção e estado vazio ilustrado.
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
      <div style={{ marginBottom: 20 }}>
        <h1 className="cm-page-title">{t('procuradores.titulo')}</h1>
        <p className="cm-page-sub">{t('procuradores.subtitulo')}</p>
      </div>

      {/* Convite */}
      <Card>
        <div style={cabecalhoCartao}>
          <div style={{ ...tileIcone, background: 'var(--azul-50)', color: 'var(--azul-700)' }}><IconeUsuario width={22} height={22} /></div>
          <div style={{ minWidth: 0 }}>
            <h2 style={tituloSecao}>{t('procuradores.convite.titulo')}</h2>
            <p style={dicaSecao}>{t('procuradores.convite.dica')}</p>
          </div>
        </div>
        <form onSubmit={submeter} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 18 }}>
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
        <div style={cabecalhoSecao}>
          <h2 style={tituloSecao}>{t('procuradores.lista.titulo')}</h2>
          {ativos.length > 0 && <span style={contador} aria-hidden>{ativos.length}</span>}
        </div>
        {ativos.length === 0 ? (
          <div data-cy="proc-vazio" style={vazio}>
            <div style={vazioIcone}><IconeUsuario width={28} height={28} /></div>
            <div style={{ font: '600 15.5px var(--font-body)', color: 'var(--azul-900)' }}>{t('procuradores.lista.vazio')}</div>
            <div style={{ fontSize: 13, color: 'var(--cinza-500)', marginTop: 5, maxWidth: 320 }}>{t('procuradores.lista.vazioDica')}</div>
          </div>
        ) : (
          <ul style={lista}>
            {ativos.map((p, i) => {
              const vinculadoEm = t('procuradores.lista.convidadoEm', { data: formatarData(p.desde, i18n.language) });
              return (
              <li
                key={p.contaId}
                data-cy="proc-item"
                style={{ ...linha, borderTop: i === 0 ? 'none' : '1px solid var(--divider)' }}
              >
                <Avatar iniciais={iniciaisDe(p.nome ?? p.identificador)} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={linhaTitulo}>{p.nome ?? p.identificador}</div>
                  <div style={linhaSub}>{p.nome ? `${p.identificador} · ${vinculadoEm}` : vinculadoEm}</div>
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
              );
            })}
          </ul>
        )}
      </Card>

      {/* Rastro de removidos (append-only, RN015) */}
      {removidos.length > 0 && (
        <Card>
          <div style={cabecalhoSecao}>
            <h2 style={tituloSecao}>{t('procuradores.removidos.titulo')}</h2>
          </div>
          <p style={{ ...dicaSecao, margin: '2px 0 4px' }}>{t('procuradores.removidos.subtitulo')}</p>
          <ul style={lista}>
            {removidos.map((p, i) => (
              <li
                key={p.contaId}
                data-cy="proc-removido"
                style={{ ...linha, borderTop: i === 0 ? 'none' : '1px solid var(--divider)', opacity: 0.72 }}
              >
                <Avatar iniciais={iniciaisDe(p.nome ?? p.identificador)} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...linhaTitulo, color: 'var(--cinza-700)' }}>{p.nome ?? p.identificador}</div>
                  <div style={linhaSub}>{p.nome ? p.identificador : t('procuradores.lista.convidadoEm', { data: formatarData(p.desde, i18n.language) })}</div>
                </div>
                <Pill tom="warn">{t('procuradores.lista.removido')}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ————— estilos (design do painel administrativo) —————
const cabecalhoCartao: CSSProperties = { display: 'flex', gap: 14, alignItems: 'center' };
const cabecalhoSecao: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 };
const tileIcone: CSSProperties = { width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const tituloSecao: CSSProperties = { font: '600 15px var(--font-body)', color: 'var(--azul-900)', margin: 0 };
const dicaSecao: CSSProperties = { font: '13px var(--font-body)', color: 'var(--cinza-500)', margin: '3px 0 0' };
const contador: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 22, padding: '0 8px', borderRadius: 999, background: 'var(--azul-50)', color: 'var(--azul-700)', font: '600 12.5px var(--font-body)' };
const lista: CSSProperties = { listStyle: 'none', padding: 0, margin: 0 };
const linha: CSSProperties = { display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0' };
const linhaTitulo: CSSProperties = { font: '600 14.5px var(--font-body)', color: 'var(--azul-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const linhaSub: CSSProperties = { fontSize: 13, color: 'var(--cinza-500)', marginTop: 3 };
const vazio: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '40px 20px' };
const vazioIcone: CSSProperties = { width: 58, height: 58, borderRadius: '50%', background: 'var(--azul-50)', color: 'var(--azul-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 };
