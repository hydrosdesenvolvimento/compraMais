import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation, Trans } from 'react-i18next';
import { Stepper, CapturaFacial } from '../../design-system/components';
import { IconeSeta, IconeVoltar, IconeFechar, IconeCheck, IconeUpload, IconeAlerta } from '../../design-system/icons';
import { api, HttpError, type DocItem, type CatalogoItemView, type ItemCredenciamentoView } from '../../lib/api';
import { TAMANHO_MAX_MB, formatoDe, lerBase64 } from '../../lib/upload';
import { obterUsuario } from '../../lib/auth';
import { textoDoErro } from '../../lib/erros';
import { toastBus } from '../../design-system/components/toast-bus';

/**
 * Wizard de credenciamento em um edital (UC004 + UC007). Passos: Capacidade (teto declarado, RN005) →
 * Documentos → Prova de Vida (comparação facial ao vivo × foto do responsável cadastrada, UC007) →
 * Termo de Aceite (RN016) → Concluído. O Termo só libera com a prova de vida aprovada.
 */

const VERSAO_TERMO = 'v1';

/**
 * Fornecedor representado pela sessão (empresa do token — AD-20). Os endpoints de documentos são por
 * fornecedor (`/fornecedores/:id/documentos`), então o Passo 2 usa a MESMA empresa do credenciamento
 * que o wizard cria. Sem sessão (ex.: render de teste), cai no fornecedor de demonstração.
 */
const DEMO_FORNECEDOR_ID = 'demo-fornecedor';

const varAzul50 = 'var(--azul-50)';
const varAzul100 = 'var(--azul-100)';

export function Credenciamento() {
  const { t, i18n } = useTranslation();
  const idioma = i18n.language;
  const navigate = useNavigate();
  const { editalId } = useParams({ strict: false }) as { editalId?: string };
  const [step, setStep] = useState(0); // 0..4 (Capacidade, Documentos, Prova de Vida, Termo, Concluído)
  const [provaAprovada, setProvaAprovada] = useState(false);
  // Capacidade POR ITEM (RN005): itens do edital + teto declarado por item selecionado (itemId → texto).
  const [itensEdital, setItensEdital] = useState<ItemCredenciamentoView[]>([]);
  const [capItens, setCapItens] = useState<Record<string, string>>({});
  const [credId, setCredId] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Enquanto consulta se já há credenciamento neste edital, para retomar do passo salvo em vez de
  // recriar (UC004) — evita o 409 `CredenciamentoDuplicado` ao reentrar num edital já iniciado.
  const [carregando, setCarregando] = useState(true);

  // Retomada do wizard: na entrada, se o fornecedor já tem um credenciamento ATIVO neste edital,
  // reidrata o estado (capacidade + passo salvo) em vez de começar do zero. `iniciado` volta ao passo
  // em que parou (Capacidade→Termo); `aceito` cai direto no Concluído. Sem vínculo ativo (204), começa
  // limpo. Falha de rede não trava: cai no fluxo novo e o backend ainda protege contra duplicidade.
  useEffect(() => {
    if (!editalId) { setCarregando(false); return; }
    let vivo = true;
    void (async () => {
      try {
        const atual = await api.credenciamentoNoEdital(editalId);
        if (!vivo || !atual) return;
        setCredId(atual.id);
        if (atual.estado === 'aceito') {
          setProvaAprovada(true);
          setStep(4);
        } else {
          // Reidrata a seleção de itens declarada (capacidade por item, RN005).
          setCapItens(Object.fromEntries(atual.itens.map((i) => [i.itemId, String(i.capacidadeTeto)])));
          // Prova de vida já aprovada num acesso anterior mantém o gate satisfeito ao retomar.
          if (atual.provaVidaStatus === 'aprovada' || atual.provaVidaStatus === 'manual') setProvaAprovada(true);
          // passoAtual 1..4 (Capacidade→Termo) → step 0..3; nunca abre no Concluído para um `iniciado`.
          setStep(Math.min(3, Math.max(0, atual.passoAtual - 1)));
          toastBus.emitir({ tom: 'info', texto: t('credenciamento.retomado') });
        }
      } catch { /* segue no fluxo novo — o iniciar ainda valida no backend */ }
      finally { if (vivo) setCarregando(false); }
    })();
    return () => { vivo = false; };
  }, [editalId, t]);

  // Itens do edital para o passo de capacidade (sem preço-teto interno). Best-effort: se falhar, o passo
  // fica sem itens e o "Continuar" permanece bloqueado (nada a declarar).
  useEffect(() => {
    if (!editalId) return;
    let vivo = true;
    void api.editalItensParaCredenciamento(editalId).then((its) => { if (vivo) setItensEdital(its); }).catch(() => {});
    return () => { vivo = false; };
  }, [editalId]);

  // Empresa do token (AD-20): mesma do credenciamento criado no Passo 1. Base dos documentos (Passo 2).
  const fornecedorId = obterUsuario()?.empresaId ?? DEMO_FORNECEDOR_ID;

  const PASSOS = [
    t('credenciamento.passos.capacidade'),
    t('credenciamento.passos.documentos'),
    t('credenciamento.passos.provaVida'),
    t('credenciamento.passos.termo'),
    t('credenciamento.passos.concluido'),
  ];

  const isSucesso = step === 4;
  const showFooter = !isSucesso;
  const showBack = step > 0;

  const nextLabel = enviando
    ? t('credenciamento.acoes.enviando')
    : step === 3 ? t('credenciamento.acoes.enviar') : t('credenciamento.acoes.continuar');

  // Itens selecionados com teto válido (inteiro > 0) — base do envio e da validação do passo.
  const itensSelecionados = Object.entries(capItens)
    .map(([itemId, texto]) => ({ itemId, teto: Number(texto) }))
    .filter(({ teto }) => Number.isInteger(teto) && teto > 0);
  const capValida = itensSelecionados.length > 0;
  const podeAvancar = enviando
    ? false
    : step === 0 ? capValida
    : step === 2 ? provaAprovada // Prova de Vida: só avança ao Termo com a verificação aprovada
    : step === 3 ? aceito
    : true;

  // Reporta ao backend o passo do wizard (UC004) para "Meus Credenciamentos" mostrar "Etapa n/N" e o
  // "Continuar" retomar de onde parou. `step` (0..3) → passo do domínio (step+1). Melhor-esforço: só a
  // partir do Documentos (passo do Concluído vem do aceite) e nunca trava a navegação se a rede falhar.
  const reportarPasso = (novoStep: number, id: string | null = credId) => {
    if (!id || novoStep < 0 || novoStep >= 4) return; // o passo Concluído (5) vem do aceite, não daqui
    void api.registrarPassoCredenciamento(id, novoStep + 1).catch(() => {});
  };

  // Feedback de falha em dois canais: toast (o pedido) + inline (persiste como contexto até a próxima
  // ação). Os catches passam a mensagem específica de `textoDoErro` (mapeada do `codigo` do backend,
  // ex.: CredenciamentoDuplicado); os guards internos usam o texto genérico.
  const mostrarErro = (texto: string) => {
    setErro(texto);
    toastBus.emitir({ tom: 'erro', texto });
  };

  async function avancar() {
    setErro(null);
    // Passo 0 → 1: declara a capacidade (teto, RN005) iniciando o credenciamento no backend.
    if (step === 0) {
      if (!editalId) { mostrarErro(t('credenciamento.erroGenerico')); return; }
      // Retomada: o credenciamento já existe (reidratado na entrada). Não recria — só avança e reporta
      // o passo. A capacidade declarada é imutável; reeditá-la aqui não gera novo teto.
      if (credId) { setStep(1); reportarPasso(1, credId); return; }
      setEnviando(true);
      try {
        const itens = itensSelecionados.map(({ itemId, teto }) => ({ itemId, capacidadeTeto: teto }));
        const r = await api.iniciarCredenciamento(editalId, itens);
        setCredId(r.credenciamentoId);
        setStep(1);
        reportarPasso(1, r.credenciamentoId); // entrou no Documentos (passo 2)
      } catch (e) { mostrarErro(textoDoErro(e)); }
      finally { setEnviando(false); }
      return;
    }
    // Passo 3 → 4: assina o Termo de Aceite (RN016) → fornecedor Pendente de Análise. O backend só
    // aceita com a prova de vida aprovada (gate UC007); o passo 2 do wizard já a exige para chegar aqui.
    if (step === 3) {
      if (!credId) { mostrarErro(t('credenciamento.erroGenerico')); return; }
      setEnviando(true);
      try {
        await api.aceitarTermo(credId, { versaoTermo: VERSAO_TERMO, finalidade: t('credenciamento.termo.finalidade') });
        setStep(4);
      } catch (e) { mostrarErro(textoDoErro(e)); }
      finally { setEnviando(false); }
      return;
    }
    setStep((s) => { const n = Math.min(4, s + 1); reportarPasso(n); return n; });
  }

  const wPrev = () => { setErro(null); setStep((s) => { const n = Math.max(0, s - 1); reportarPasso(n); return n; }); };

  async function cancelWizard() {
    if (credId) { try { await api.cancelarCredenciamento(credId); } catch { /* segue para a vitrine mesmo assim */ } }
    void navigate({ to: '/editais' });
  }

  // Evita piscar o passo 0 (Capacidade em branco) antes de resolver a retomada: sem isto, um edital já
  // iniciado abriria no zero por um instante e só então saltaria ao passo salvo.
  if (carregando) {
    return (
      <div data-cy="credenciamento-carregando" style={{ maxWidth: 940, margin: '0 auto', padding: '80px 0', textAlign: 'center', color: 'var(--cinza-500)', font: '600 14px var(--font-body)' }}>
        {t('credenciamento.carregando')}
      </div>
    );
  }

  return (
    <div
      data-cy="credenciamento"
      style={{ maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}
    >
      {/* Topo: voltar à vitrine + edital em credenciamento */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          data-cy="voltar-vitrine"
          onClick={() => void navigate({ to: '/editais' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 16px',
            border: '1.5px solid var(--border)',
            borderRadius: 9,
            background: '#fff',
            color: 'var(--cinza-700)',
            font: '600 14px var(--font-body)',
            cursor: 'pointer',
          }}
        >
          <IconeVoltar width={16} height={16} />
          {t('credenciamento.voltarVitrine')}
        </button>
        <div style={{ font: '600 13px var(--font-body)', color: 'var(--cinza-500)' }}>{t('credenciamento.noEdital')}</div>
      </div>

      {/* Stepper */}
      <Stepper passos={PASSOS} ativo={step} />

      {/* Card principal */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '28px 30px 26px' }}>
          {step === 0 && <PassoCapacidade itens={itensEdital} capItens={capItens} setCapItens={setCapItens} idioma={idioma} />}
          {step === 1 && <PassoDocumentos fornecedorId={fornecedorId} />}
          {step === 2 && <PassoProvaDeVida credId={credId} aprovada={provaAprovada} setAprovada={setProvaAprovada} />}
          {step === 3 && <PassoTermo aceito={aceito} setAceito={setAceito} />}
          {step === 4 && <PassoSucesso credId={credId} onPainel={() => void navigate({ to: '/inicio' })} />}
        </div>

        {erro && (
          <div data-cy="erro-credenciamento" style={{ padding: '0 30px 18px', color: 'var(--erro, #B42318)', font: '600 13.5px var(--font-body)' }}>
            {erro}
          </div>
        )}

        {showFooter && (
          <div
            style={{
              padding: '18px 30px',
              borderTop: '1px solid var(--divider)',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              background: 'var(--bg-page)',
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {showBack ? (
                <button
                  type="button"
                  data-cy="voltar"
                  onClick={wPrev}
                  disabled={enviando}
                  style={footerGhostStyle}
                >
                  <IconeVoltar width={16} height={16} />
                  {t('credenciamento.acoes.voltar')}
                </button>
              ) : (
                <button
                  type="button"
                  data-cy="cancelar"
                  onClick={() => void cancelWizard()}
                  disabled={enviando}
                  style={footerGhostStyle}
                >
                  <IconeFechar width={16} height={16} />
                  {t('credenciamento.acoes.cancelar')}
                </button>
              )}

              <button
                type="button"
                data-cy="avancar"
                onClick={() => void avancar()}
                disabled={!podeAvancar}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: 9,
                  background: podeAvancar ? 'var(--azul-700)' : 'var(--cinza-300)',
                  color: '#fff',
                  font: '600 14.5px var(--font-body)',
                  cursor: podeAvancar ? 'pointer' : 'not-allowed',
                }}
              >
                {nextLabel}
                <IconeSeta width={16} height={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const footerGhostStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 20px',
  border: '1.5px solid var(--border)',
  borderRadius: 9,
  background: '#fff',
  color: 'var(--cinza-700)',
  font: '600 14px var(--font-body)',
  cursor: 'pointer',
} as const;

/* ---------- Passo 1: Capacidade produtiva ---------- */
function PassoCapacidade({ itens, capItens, setCapItens, idioma }: {
  itens: ItemCredenciamentoView[];
  capItens: Record<string, string>;
  setCapItens: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  idioma: string;
}) {
  const { t } = useTranslation();
  const numero = (n: number) => new Intl.NumberFormat(idioma).format(n);
  const alternar = (itemId: string) => setCapItens((m) => {
    const novo = { ...m };
    if (itemId in novo) delete novo[itemId]; else novo[itemId] = '';
    return novo;
  });
  const definirTeto = (itemId: string, v: string) => setCapItens((m) => ({ ...m, [itemId]: v }));
  return (
    <div>
      <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.1em', color: 'var(--azul-700)', marginBottom: 6 }}>
        {t('credenciamento.capacidade.passo')}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, color: 'var(--azul-900)', margin: '0 0 22px' }}>
        {t('credenciamento.capacidade.titulo')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 30, alignItems: 'start' }}>
        <div>
          <p style={{ fontSize: 14.5, color: 'var(--cinza-500)', lineHeight: 1.6, margin: '0 0 20px' }}>
            <Trans i18nKey="credenciamento.capacidade.descricaoItens" components={{ b: <strong /> }} />
          </p>

          {itens.length === 0 ? (
            <div data-cy="capacidade-sem-itens" style={{ padding: '20px 18px', borderRadius: 10, border: '1px dashed var(--border)', color: 'var(--cinza-500)', fontSize: 13.5 }}>
              {t('credenciamento.capacidade.semItens')}
            </div>
          ) : (
            <div data-cy="capacidade-itens" style={{ display: 'grid', gap: 10 }}>
              {itens.map((it) => {
                const selecionado = it.itemId in capItens;
                return (
                  <div key={it.itemId} data-cy="capacidade-item" data-id={it.itemId} data-selecionado={selecionado}
                    style={{ border: `1px solid ${selecionado ? 'var(--azul-300, #9db8e0)' : 'var(--border)'}`, background: selecionado ? varAzul50 : '#fff', borderRadius: 10, padding: '12px 14px' }}>
                    <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" data-cy="capacidade-item-check" checked={selecionado} onChange={() => alternar(it.itemId)} style={{ width: 16, height: 16, accentColor: 'var(--azul-700)', flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ font: '600 13.5px var(--font-body)', color: 'var(--azul-900)' }}>{it.nome}</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--cinza-500)' }}>
                          {t('credenciamento.capacidade.itemDemanda', { qtd: numero(it.quantidade), unidade: it.unidade })}
                        </span>
                      </span>
                    </label>
                    {selecionado && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, paddingLeft: 26 }}>
                        <label style={{ font: '600 12px var(--font-body)', color: 'var(--cinza-700)' }} htmlFor={`teto-${it.itemId}`}>
                          {t('credenciamento.capacidade.tetoItemLabel', { unidade: it.unidade })}
                        </label>
                        <input id={`teto-${it.itemId}`} data-cy="capacidade-item-teto" type="number" min={1} value={capItens[it.itemId] ?? ''}
                          onChange={(e) => definirTeto(it.itemId, e.target.value)} placeholder={t('credenciamento.capacidade.placeholder')}
                          style={{ width: 130, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, font: '15px var(--font-body)', background: '#fff', outline: 'none' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 14, fontSize: 12.5, color: 'var(--cinza-500)', lineHeight: 1.5 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--azul-600)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {t('credenciamento.capacidade.dicaItens')}
          </div>
        </div>

        <div style={{ background: varAzul50, border: `1px solid ${varAzul100}`, borderRadius: 12, padding: '22px 24px' }}>
          <div
            style={{
              font: '600 11px var(--font-body)',
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--azul-700)',
              marginBottom: 14,
            }}
          >
            {t('credenciamento.capacidade.tetoTitulo')}
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <PassoNumerado n={1}>
              <Trans i18nKey="credenciamento.capacidade.teto1" components={{ b: <strong /> }} />
            </PassoNumerado>
            <PassoNumerado n={2}>
              <Trans i18nKey="credenciamento.capacidade.teto2" components={{ b: <strong /> }} />
            </PassoNumerado>
            <PassoNumerado n={3}>
              <Trans i18nKey="credenciamento.capacidade.teto3" components={{ b: <strong /> }} />
            </PassoNumerado>
          </div>
        </div>
      </div>
    </div>
  );
}

function PassoNumerado({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 11 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#fff',
          color: 'var(--azul-700)',
          font: '600 13px var(--font-body)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--azul-800)', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

/* ---------- Passo 2: Documentos exigidos (RF002 · A1 do UC004) ---------- */

/**
 * Estado de um tipo exigido perante o repositório do fornecedor (documentos são globais, reusáveis
 * entre editais — não há vínculo por edital). `importado` = já aprovado e vigente (reaproveitamento
 * automático, A1); `emAnalise` = enviado e aguardando covalidação (UC006); `reprovado`/`vencido` pedem
 * novo envio; `faltando` = nunca enviado. Não bloqueia o avanço: a conclusão do UC004 é por Termo (RN016)
 * e a covalidação é assíncrona.
 */
type EstadoTipo = 'importado' | 'emAnalise' | 'reprovado' | 'vencido' | 'faltando';

/** Melhor documento do fornecedor para um tipo (por nome): aprovado+vigente > pendente > reprovado > vencido. */
function melhorDoc(docs: DocItem[], nome: string): DocItem | undefined {
  const prio = (d: DocItem): number =>
    d.status === 'aprovado' && d.situacao !== 'expirado' ? 0
    : d.status === 'pendente' ? 1
    : d.status === 'reprovado' ? 2 : 3;
  return docs.filter((d) => d.tipo === nome).sort((a, b) => prio(a) - prio(b))[0];
}

function estadoDoTipo(doc: DocItem | undefined): EstadoTipo {
  if (!doc) return 'faltando';
  if (doc.status === 'reprovado') return 'reprovado';
  if (doc.status === 'pendente') return 'emAnalise';
  if (doc.situacao === 'expirado') return 'vencido';
  return 'importado';
}

/** Selo visual por estado do tipo — cor, ícone e chave i18n do rótulo. */
function seloDoEstado(e: EstadoTipo): { bg: string; cor: string; icone: 'check' | 'mais' | 'alerta'; chave: string } {
  switch (e) {
    case 'importado': return { bg: 'var(--sucesso-bg)', cor: 'var(--sucesso)', icone: 'check', chave: 'credenciamento.documentos.importado' };
    case 'emAnalise': return { bg: 'var(--azul-50)', cor: 'var(--azul-700)', icone: 'check', chave: 'credenciamento.documentos.emAnalise' };
    case 'reprovado': return { bg: 'var(--erro-bg)', cor: 'var(--erro-700, #B42318)', icone: 'alerta', chave: 'credenciamento.documentos.reprovadoCurto' };
    case 'vencido': return { bg: 'var(--erro-bg)', cor: 'var(--erro-700, #B42318)', icone: 'alerta', chave: 'credenciamento.documentos.vencidoCurto' };
    default: return { bg: 'var(--atencao-bg)', cor: '#8A5410', icone: 'mais', chave: 'credenciamento.documentos.necessarioEnviar' };
  }
}

function IconeSelo({ tipo, ...p }: { tipo: 'check' | 'mais' | 'alerta'; width?: number; height?: number }) {
  if (tipo === 'check') return <IconeCheck width={p.width ?? 18} height={p.height ?? 18} strokeWidth={2.2} />;
  if (tipo === 'alerta') return <IconeAlerta width={p.width ?? 18} height={p.height ?? 18} />;
  return (
    <svg width={p.width ?? 18} height={p.height ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function PassoDocumentos({ fornecedorId }: { fornecedorId: string }) {
  const { t } = useTranslation();
  const [tipos, setTipos] = useState<CatalogoItemView[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Fonte de verdade: catálogo de Tipos de Documento (RF022) × documentos do fornecedor (globais). O
  // reaproveitamento (A1) é derivado em leitura — nada é anexado ao credenciamento. Tolerante a falha:
  // sem catálogo/documentos, mostra a lista vazia em vez de quebrar o wizard.
  const recarregar = useCallback(async () => {
    const safe = async <T,>(fn: () => Promise<T>, fb: T): Promise<T> => { try { return await fn(); } catch { return fb; } };
    const [tp, dc] = await Promise.all([
      safe(() => api.catalogoListar('tipos-documento'), [] as CatalogoItemView[]),
      safe(() => api.documentos(fornecedorId), [] as DocItem[]),
    ]);
    setTipos(tp);
    setDocs(dc);
    setCarregando(false);
  }, [fornecedorId]);

  useEffect(() => { setCarregando(true); void recarregar(); }, [recarregar]);

  const linhas = tipos.map((tp) => ({ tp, estado: estadoDoTipo(melhorDoc(docs, tp.nome ?? '')) }));
  const pendentes = linhas.filter((l) => l.estado === 'faltando' || l.estado === 'reprovado' || l.estado === 'vencido');

  return (
    <div>
      <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.1em', color: 'var(--azul-700)', marginBottom: 6 }}>
        {t('credenciamento.documentos.passo')}
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, color: 'var(--azul-900)', margin: '0 0 8px' }}>
        {t('credenciamento.documentos.titulo')}
      </h2>
      <p style={{ fontSize: 14.5, color: 'var(--cinza-500)', lineHeight: 1.55, margin: '0 0 22px' }}>
        <Trans i18nKey="credenciamento.documentos.descricao" components={{ b: <strong /> }} />
      </p>

      {carregando ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--cinza-500)', font: '600 14px var(--font-body)' }}>
          {t('credenciamento.carregando')}
        </div>
      ) : linhas.length === 0 ? (
        <div data-cy="doc-lista-vazia" style={{ padding: '28px 0', textAlign: 'center', color: 'var(--cinza-500)', fontSize: 14 }}>
          {t('credenciamento.documentos.listaVazia')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {linhas.map(({ tp, estado }) => {
            const s = seloDoEstado(estado);
            return (
              <div
                key={tp.id}
                data-cy="doc-linha"
                style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 11, background: '#fff' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, background: s.bg, color: s.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconeSelo tipo={s.icone} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: '600 14.5px var(--font-body)', color: 'var(--cinza-900)' }}>{tp.nome}</span>
                  {tp.obrigatorio && (
                    <span data-cy="doc-obrigatorio" style={{ font: '600 10.5px var(--font-body)', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--azul-700)', background: 'var(--azul-50)', border: '1px solid var(--azul-100)', borderRadius: 999, padding: '2px 8px' }}>
                      {t('credenciamento.documentos.obrigatorio')}
                    </span>
                  )}
                </div>
                <span style={{ font: '600 12px var(--font-body)', color: s.cor, textAlign: 'right' }}>{t(s.chave)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Envio real dos pendentes (cifrado em repouso, AD-19). Some quando não há pendências. */}
      {!carregando && pendentes.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ font: '600 13.5px var(--font-body)', color: 'var(--azul-900)', margin: '0 0 12px' }}>
            {t('credenciamento.documentos.enviarPendentes')}
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {pendentes.map(({ tp }) => (
              <UploadPendente key={tp.id} fornecedorId={fornecedorId} tipo={tp} onEnviado={() => void recarregar()} />
            ))}
          </div>
        </div>
      )}

      {!carregando && linhas.length > 0 && pendentes.length === 0 && (
        <div data-cy="doc-sem-pendentes" style={{ marginTop: 22, padding: '14px 16px', background: 'var(--sucesso-bg)', borderRadius: 10, display: 'flex', gap: 11, alignItems: 'center' }}>
          <span style={{ color: 'var(--sucesso)', flexShrink: 0, display: 'inline-flex' }}><IconeCheck width={18} height={18} strokeWidth={2.2} /></span>
          <span style={{ fontSize: 13.5, color: 'var(--sucesso-800, #1E6B3A)', lineHeight: 1.5 }}>{t('credenciamento.documentos.semPendentes')}</span>
        </div>
      )}
    </div>
  );
}

/** Envio de um tipo pendente: escolhe o arquivo (PDF/JPG/PNG), a validade (quando exigida) e envia. */
function UploadPendente({ fornecedorId, tipo, onEnviado }: { fornecedorId: string; tipo: CatalogoItemView; onEnviado: () => void }) {
  const { t } = useTranslation();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [validade, setValidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const exigeValidade = tipo.exigeValidade === true;

  const escolher = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErro(null);
    const f = e.target.files?.[0] ?? null;
    if (f && !formatoDe(f.name)) { setErro(t('credenciamento.documentos.erroFormato')); setArquivo(null); return; }
    if (f && f.size > TAMANHO_MAX_MB * 1024 * 1024) { setErro(t('credenciamento.documentos.erroTamanho', { mb: TAMANHO_MAX_MB })); setArquivo(null); return; }
    setArquivo(f);
  };

  const enviar = async () => {
    if (!arquivo) return;
    if (exigeValidade && !validade) { setErro(t('credenciamento.documentos.validadeObrigatoria')); return; }
    setEnviando(true);
    setErro(null);
    try {
      const formato = formatoDe(arquivo.name)!;
      const conteudo = await lerBase64(arquivo);
      await api.enviarDocumento(fornecedorId, { tipo: tipo.nome ?? '', formato, conteudo, dataValidade: validade || null });
      toastBus.emitir({ tom: 'ok', texto: t('credenciamento.documentos.enviadoSucesso', { tipo: tipo.nome }) });
      onEnviado();
    } catch {
      setErro(t('credenciamento.documentos.erroEnviar'));
      setEnviando(false);
    }
  };

  return (
    <div data-cy="upload-doc" style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: 18, background: 'var(--bg-page)' }}>
      <div style={{ font: '600 13.5px var(--font-body)', color: 'var(--cinza-900)', marginBottom: 10 }}>{tipo.nome}</div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <span style={{ width: 42, height: 42, borderRadius: 11, background: '#fff', color: 'var(--azul-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-xs)' }}>
          <IconeUpload width={22} height={22} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', font: '600 14px var(--font-body)', color: 'var(--azul-800)' }}>
            {arquivo ? arquivo.name : t('credenciamento.documentos.arraste')}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--cinza-400)', marginTop: 3 }}>{t('credenciamento.documentos.limite')}</span>
        </span>
        <input data-cy="upload-doc-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={escolher} style={{ display: 'none' }} />
      </label>

      {exigeValidade && (
        <label style={{ display: 'block', marginTop: 12 }}>
          <span style={{ display: 'block', font: '600 12.5px var(--font-body)', color: 'var(--cinza-700)', marginBottom: 6 }}>{t('credenciamento.documentos.validadeLabel')}</span>
          <input
            data-cy="upload-doc-validade"
            type="date"
            value={validade}
            onChange={(ev) => setValidade(ev.target.value)}
            style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 9, font: '14px var(--font-body)', background: '#fff' }}
          />
        </label>
      )}

      {erro && <div role="alert" data-cy="upload-doc-erro" style={{ marginTop: 10, fontSize: 12.5, color: 'var(--erro, #B42318)', font: '600 12.5px var(--font-body)' }}>{erro}</div>}

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          data-cy="enviar-doc-pendente"
          onClick={() => void enviar()}
          disabled={!arquivo || enviando}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: 'none', borderRadius: 9,
            background: !arquivo || enviando ? 'var(--cinza-300)' : 'var(--azul-700)', color: '#fff',
            font: '600 13.5px var(--font-body)', cursor: !arquivo || enviando ? 'not-allowed' : 'pointer',
          }}
        >
          {enviando ? t('credenciamento.documentos.enviando') : t('credenciamento.documentos.enviarArquivo')}
        </button>
      </div>
    </div>
  );
}

/* ---------- Passo 3: Termo de Aceite (RN016) ---------- */
/**
 * Passo 3 do wizard (UC007): captura ao vivo comparada 1:1 com a foto do responsável cadastrada
 * (referência aprovada pela CPL). Aprovada → libera o Termo (o gate real está no backend). Falha de
 * captura/serviço vira mensagem específica, mapeada do `codigo` do backend; nada aqui conclui nada.
 */
function PassoProvaDeVida({ credId, aprovada, setAprovada }: { credId: string | null; aprovada: boolean; setAprovada: (v: boolean) => void }) {
  const { t } = useTranslation();
  const [verificando, setVerificando] = useState(false);
  const [msg, setMsg] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  async function verificar(imagem: string) {
    if (!credId) { setMsg({ tom: 'erro', texto: t('credenciamento.provaVida.erroGenerico') }); return; }
    setVerificando(true);
    setMsg(null);
    try {
      const r = await api.provaDeVida(credId, imagem);
      if (r.status === 'aprovada' || r.status === 'manual') {
        setAprovada(true);
        setMsg({ tom: 'ok', texto: t('credenciamento.provaVida.aprovada') });
      } else {
        setAprovada(false);
        setMsg({ tom: 'erro', texto: t('credenciamento.provaVida.reprovada') });
      }
    } catch (e) {
      setAprovada(false);
      const codigo = e instanceof HttpError ? e.codigo : undefined;
      setMsg({ tom: 'erro', texto: t(`credenciamento.provaVida.${codigo}`, { defaultValue: t('credenciamento.provaVida.erroGenerico') }) });
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div data-cy="prova-de-vida">
      <div style={{ font: '800 11px var(--font-body)', letterSpacing: '.08em', color: 'var(--azul-700, #1d4ed8)' }}>
        {t('credenciamento.provaVida.passo')}
      </div>
      <h2 style={{ margin: '6px 0', font: '800 20px var(--font-head)', color: 'var(--cinza-900)' }}>
        {t('credenciamento.provaVida.titulo')}
      </h2>
      <p style={{ margin: '0 0 4px', color: 'var(--cinza-600)', font: '500 14px var(--font-body)' }}>
        {t('credenciamento.provaVida.descricao')}
      </p>
      <p style={{ margin: '0 0 16px', color: 'var(--cinza-500)', font: '500 13px var(--font-body)' }}>
        {t('credenciamento.provaVida.instrucao')}
      </p>

      <CapturaFacial onCapturar={verificar} ocupado={verificando} cyPrefix="prova" />

      {(msg || aprovada) && (
        <div
          data-cy={(msg?.tom ?? 'ok') === 'ok' && (aprovada || msg?.tom === 'ok') ? 'prova-ok' : 'prova-erro'}
          style={{ marginTop: 14, color: (msg?.tom ?? 'ok') === 'erro' ? 'var(--erro, #B42318)' : 'var(--sucesso, #067647)', font: '600 13.5px var(--font-body)' }}
        >
          {msg?.texto ?? t('credenciamento.provaVida.aprovada')}
        </div>
      )}
    </div>
  );
}

function PassoTermo({ aceito, setAceito }: { aceito: boolean; setAceito: (v: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <div data-cy="termo-aceite" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.1em', color: 'var(--azul-700)', marginBottom: 6 }}>
        {t('credenciamento.termo.passo')}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--azul-900)',
          margin: '0 0 8px',
        }}
      >
        {t('credenciamento.termo.titulo')}
      </h2>
      <p style={{ fontSize: 14.5, color: 'var(--cinza-500)', lineHeight: 1.55, margin: '0 0 20px' }}>
        <Trans i18nKey="credenciamento.termo.descricao" components={{ b: <strong /> }} />
      </p>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--cinza-400)', marginBottom: 3 }}>
            {t('credenciamento.termo.versaoLabel')}
          </div>
          <div data-cy="termo-versao" style={{ font: '600 14px var(--font-body)', color: 'var(--azul-800)' }}>{VERSAO_TERMO}</div>
        </div>
        <div>
          <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--cinza-400)', marginBottom: 3 }}>
            {t('credenciamento.termo.finalidadeLabel')}
          </div>
          <div style={{ font: '600 14px var(--font-body)', color: 'var(--azul-800)' }}>{t('credenciamento.termo.finalidade')}</div>
        </div>
      </div>

      <div
        style={{
          background: varAzul50,
          border: `1px solid ${varAzul100}`,
          borderRadius: 12,
          padding: '18px 20px',
          fontSize: 13.5,
          color: 'var(--azul-900)',
          lineHeight: 1.6,
          marginBottom: 18,
        }}
      >
        {t('credenciamento.termo.resumo')}
      </div>

      <label
        style={{
          display: 'flex',
          gap: 11,
          alignItems: 'flex-start',
          padding: '14px 16px',
          border: `1.5px solid ${aceito ? 'var(--azul-500)' : 'var(--border)'}`,
          borderRadius: 11,
          background: aceito ? varAzul50 : '#fff',
          cursor: 'pointer',
        }}
      >
        <input
          data-cy="aceitar-termo"
          type="checkbox"
          checked={aceito}
          onChange={(e) => setAceito(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: 'var(--azul-700)' }}
        />
        <span style={{ font: '600 14px var(--font-body)', color: 'var(--cinza-900)', lineHeight: 1.5 }}>
          {t('credenciamento.termo.checkbox')}
        </span>
      </label>
    </div>
  );
}

/* ---------- Passo 4: Sucesso ---------- */

/** Dispara o download do blob no navegador sem sair da SPA (mesmo padrão da exportação da auditoria). */
function salvarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function PassoSucesso({ credId, onPainel }: { credId: string | null; onPainel: () => void }) {
  const { t } = useTranslation();
  const [baixando, setBaixando] = useState(false);

  // Baixa o comprovante canônico (PDF do servidor). Rota protegida → via Bearer (api.comprovante…),
  // salvando o blob localmente. Falha vira toast; o botão volta ao estado normal.
  const baixarPdf = async () => {
    if (!credId || baixando) return;
    setBaixando(true);
    try {
      const { blob, nome } = await api.comprovanteCredenciamento(credId);
      salvarArquivo(blob, nome);
    } catch {
      toastBus.emitir({ tom: 'erro', texto: t('credenciamento.enviado.baixarPdfErro') });
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div data-cy="credenciamento-enviado" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '14px 0' }}>
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: '50%',
          background: 'var(--sucesso-bg)',
          color: 'var(--sucesso)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <IconeCheck width={40} height={40} strokeWidth={2.2} />
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 25,
          color: 'var(--azul-900)',
          margin: '0 0 10px',
        }}
      >
        {t('credenciamento.enviado.titulo')}
      </h2>
      <p style={{ fontSize: 15, color: 'var(--cinza-500)', lineHeight: 1.6, margin: '0 0 8px' }}>
        {t('credenciamento.enviado.descricao')}
      </p>
      <div
        data-cy="status-pendente"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 18px',
          borderRadius: 999,
          background: 'var(--atencao-bg)',
          color: '#8A5410',
          font: '600 13px var(--font-body)',
          marginBottom: 26,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--atencao)' }} />
        {t('credenciamento.enviado.status')}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          data-cy="baixar-pdf"
          onClick={() => void baixarPdf()}
          disabled={!credId || baixando}
          style={{
            padding: '12px 22px',
            border: '1.5px solid var(--azul-700)',
            borderRadius: 10,
            background: '#fff',
            color: 'var(--azul-700)',
            font: '600 14.5px var(--font-body)',
            cursor: !credId || baixando ? 'not-allowed' : 'pointer',
            opacity: !credId || baixando ? 0.6 : 1,
          }}
        >
          {baixando ? t('credenciamento.enviado.baixarPdfProcessando') : t('credenciamento.enviado.baixarPdf')}
        </button>
        <button
          type="button"
          data-cy="voltar-painel"
          onClick={onPainel}
          style={{
            padding: '12px 22px',
            border: 'none',
            borderRadius: 10,
            background: 'var(--azul-700)',
            color: '#fff',
            font: '600 14.5px var(--font-body)',
            cursor: 'pointer',
          }}
        >
          {t('credenciamento.enviado.voltarPainel')}
        </button>
      </div>
    </div>
  );
}
