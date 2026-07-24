import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useNavigate, type Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { IconeBusca, IconeEditais, IconeDocumentos, IconeUsuario } from './icons';
import { definirBuscaPendente, type FonteBusca, type ItemBusca, type TipoBusca } from '../lib/busca-global';

type LinkTo = ComponentProps<typeof Link>['to'];

/** Mínimo de caracteres para disparar a busca (evita ruído em 1 letra). */
const MIN_CARACTERES = 2;
const DEBOUNCE_MS = 250;

const ICONE: Record<TipoBusca, ReactNode> = {
  editais: <IconeEditais width={17} height={17} />,
  documentos: <IconeDocumentos width={17} height={17} />,
  fornecedores: <IconeUsuario width={17} height={17} />,
};

interface Grupo { fonte: FonteBusca; itens: ItemBusca[] }

/**
 * Busca global da topbar: consulta em paralelo as `fontes` fornecidas pelo shell (editais, documentos,
 * fornecedores — conforme o perfil), com debounce, e mostra os resultados agrupados por tipo. Clicar num
 * resultado leva à página do domínio já filtrada pelo termo (via prefill efêmero em `busca-global`).
 */
export function BuscaGlobal({ fontes }: { fontes: FonteBusca[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const consulta = termo.trim();
  const ativo = consulta.length >= MIN_CARACTERES;

  useEffect(() => {
    if (!ativo) { setGrupos([]); setCarregando(false); return; }
    let cancelado = false;
    setCarregando(true);
    const id = setTimeout(async () => {
      const resultados = await Promise.all(
        fontes.map(async (fonte) => ({ fonte, itens: await fonte.buscar(consulta).catch(() => [] as ItemBusca[]) })),
      );
      if (cancelado) return;
      setGrupos(resultados.filter((g) => g.itens.length > 0));
      setCarregando(false);
    }, DEBOUNCE_MS);
    return () => { cancelado = true; clearTimeout(id); };
  }, [consulta, ativo, fontes]);

  function abrir(fonte: FonteBusca) {
    definirBuscaPendente(fonte.href, consulta);
    setAberto(false);
    setTermo('');
    void navigate({ to: fonte.href as LinkTo });
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setAberto(false); (e.target as HTMLInputElement).blur(); }
    else if (e.key === 'Enter' && grupos[0]) { abrir(grupos[0].fonte); }
  }

  const semResultados = ativo && !carregando && grupos.length === 0;

  return (
    <div
      ref={containerRef}
      className="cm-search-wrap"
      style={{ position: 'relative' }}
      onBlur={(e) => { if (!containerRef.current?.contains(e.relatedTarget as Node)) setAberto(false); }}
    >
      <div className="cm-search">
        <IconeBusca width={17} height={17} stroke="var(--cinza-400)" />
        <input
          data-cy="busca"
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
          placeholder={t('common.shell.search')}
          aria-label={t('common.shell.searchAria')}
          role="combobox"
          aria-expanded={aberto && ativo}
          aria-controls="cm-busca-resultados"
          autoComplete="off"
        />
      </div>

      {aberto && ativo && (
        <div id="cm-busca-resultados" className="cm-menu-pop" data-cy="busca-resultados" role="listbox" style={{ width: 380, maxWidth: '90vw', maxHeight: 420, overflowY: 'auto' }}>
          {carregando && <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--cinza-500)' }} data-cy="busca-carregando">{t('common.shell.busca.carregando')}</div>}

          {semResultados && <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--cinza-500)' }} data-cy="busca-vazio">{t('common.shell.busca.vazio', { termo: consulta })}</div>}

          {!carregando && grupos.map((g) => (
            <div key={g.fonte.tipo} data-cy={`busca-grupo-${g.fonte.tipo}`}>
              <div className="cm-menu-head" style={{ padding: '10px 14px 6px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--cinza-400)', fontWeight: 600 }}>
                {t(`common.shell.busca.tipo.${g.fonte.tipo}`)}
              </div>
              <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {g.itens.map((it) => (
                  <button
                    key={`${g.fonte.tipo}-${it.id}`}
                    type="button"
                    data-cy="busca-item"
                    role="option"
                    aria-selected={false}
                    onClick={() => abrir(g.fonte)}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 10px', borderRadius: 8, border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer', background: 'transparent' }}
                  >
                    <span style={{ flexShrink: 0, marginTop: 1, color: 'var(--azul-600)' }}>{ICONE[g.fonte.tipo]}</span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--azul-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.titulo}</span>
                      {it.subtitulo && <span style={{ display: 'block', fontSize: 11, color: 'var(--cinza-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.subtitulo}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
