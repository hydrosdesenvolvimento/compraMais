import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation, Trans } from 'react-i18next';
import { Stepper } from '../../design-system/components';
import { IconeSeta, IconeVoltar, IconeFechar, IconeCheck, IconeUpload } from '../../design-system/icons';
import { api } from '../../lib/api';
import { textoDoErro } from '../../lib/erros';
import { toastBus } from '../../design-system/components/toast-bus';

/**
 * Wizard de credenciamento em um edital (UC004). Passos: Capacidade (teto declarado, RN005) →
 * Documentos → Termo de Aceite (RN016) → Concluído. A conclusão é por Termo de Aceite; a biometria/
 * "prova de vida" (UC007) está fora do MVP (Release 2, condicional a RIPD).
 */

type DocReq = { nome: string; reuse: boolean };

const VERSAO_TERMO = 'v1';

const REQ_DOCS: DocReq[] = [
  { nome: 'Cartão CNPJ atualizado', reuse: true },
  { nome: 'Contrato social consolidado', reuse: true },
  { nome: 'Certidão negativa de débitos federais', reuse: true },
  { nome: 'Certidão negativa de débitos estaduais', reuse: false },
  { nome: 'Certidão negativa trabalhista (CNDT)', reuse: false },
  { nome: 'Balanço patrimonial do último exercício', reuse: true },
];

const varAzul50 = 'var(--azul-50)';
const varAzul100 = 'var(--azul-100)';

export function Credenciamento() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { editalId } = useParams({ strict: false }) as { editalId?: string };
  const [step, setStep] = useState(0); // 0..3
  const [cap, setCap] = useState('');
  const [credId, setCredId] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const PASSOS = [
    t('credenciamento.passos.capacidade'),
    t('credenciamento.passos.documentos'),
    t('credenciamento.passos.termo'),
    t('credenciamento.passos.concluido'),
  ];

  const isSucesso = step === 3;
  const showFooter = !isSucesso;
  const showBack = step > 0;

  const nextLabel = enviando
    ? t('credenciamento.acoes.enviando')
    : step === 2 ? t('credenciamento.acoes.enviar') : t('credenciamento.acoes.continuar');

  const capNum = Number(cap);
  const capValida = Number.isInteger(capNum) && capNum > 0;
  const podeAvancar = enviando
    ? false
    : step === 0 ? capValida
    : step === 2 ? aceito
    : true;

  // Reporta ao backend o passo do wizard (UC004) para "Meus Credenciamentos" mostrar "Etapa n/N" e o
  // "Continuar" retomar de onde parou. `step` (0..3) → passo do domínio (step+1). Melhor-esforço: só a
  // partir do Documentos (passo do Concluído vem do aceite) e nunca trava a navegação se a rede falhar.
  const reportarPasso = (novoStep: number, id: string | null = credId) => {
    if (!id || novoStep < 0 || novoStep >= 3) return;
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
      setEnviando(true);
      try {
        const r = await api.iniciarCredenciamento(editalId, capNum);
        setCredId(r.credenciamentoId);
        setStep(1);
        reportarPasso(1, r.credenciamentoId); // entrou no Documentos (passo 2)
      } catch (e) { mostrarErro(textoDoErro(e)); }
      finally { setEnviando(false); }
      return;
    }
    // Passo 2 → 3: assina o Termo de Aceite (RN016) → fornecedor Pendente de Análise.
    if (step === 2) {
      if (!credId) { mostrarErro(t('credenciamento.erroGenerico')); return; }
      setEnviando(true);
      try {
        await api.aceitarTermo(credId, { versaoTermo: VERSAO_TERMO, finalidade: t('credenciamento.termo.finalidade') });
        setStep(3);
      } catch (e) { mostrarErro(textoDoErro(e)); }
      finally { setEnviando(false); }
      return;
    }
    setStep((s) => { const n = Math.min(3, s + 1); reportarPasso(n); return n; });
  }

  const wPrev = () => { setErro(null); setStep((s) => { const n = Math.max(0, s - 1); reportarPasso(n); return n; }); };

  async function cancelWizard() {
    if (credId) { try { await api.cancelarCredenciamento(credId); } catch { /* segue para a vitrine mesmo assim */ } }
    void navigate({ to: '/editais' });
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
          {step === 0 && <PassoCapacidade cap={cap} setCap={setCap} />}
          {step === 1 && <PassoDocumentos />}
          {step === 2 && <PassoTermo aceito={aceito} setAceito={setAceito} />}
          {step === 3 && <PassoSucesso onPainel={() => void navigate({ to: '/inicio' })} />}
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
function PassoCapacidade({ cap, setCap }: { cap: string; setCap: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div>
      <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.1em', color: 'var(--azul-700)', marginBottom: 6 }}>
        {t('credenciamento.capacidade.passo')}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--azul-900)',
          margin: '0 0 22px',
        }}
      >
        {t('credenciamento.capacidade.titulo')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 30, alignItems: 'start' }}>
        <div>
          <p style={{ fontSize: 14.5, color: 'var(--cinza-500)', lineHeight: 1.6, margin: '0 0 20px' }}>
            <Trans i18nKey="credenciamento.capacidade.descricao" components={{ b: <strong /> }} />
          </p>
          <label
            style={{ font: '600 12.5px var(--font-body)', color: 'var(--cinza-700)', marginBottom: 8, display: 'block' }}
          >
            {t('credenciamento.capacidade.label')}
          </label>
          <input
            data-cy="capacidade"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            type="number"
            min={1}
            placeholder={t('credenciamento.capacidade.placeholder')}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              font: '18px var(--font-body)',
              background: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'flex',
              gap: 9,
              alignItems: 'flex-start',
              marginTop: 12,
              fontSize: 12.5,
              color: 'var(--cinza-500)',
              lineHeight: 1.5,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--azul-600)"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {t('credenciamento.capacidade.dica')}
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

/* ---------- Passo 2: Documentos exigidos ---------- */
function PassoDocumentos() {
  const { t } = useTranslation();
  return (
    <div>
      <div style={{ font: '600 11px var(--font-body)', letterSpacing: '.1em', color: 'var(--azul-700)', marginBottom: 6 }}>
        {t('credenciamento.documentos.passo')}
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
        {t('credenciamento.documentos.titulo')}
      </h2>
      <p style={{ fontSize: 14.5, color: 'var(--cinza-500)', lineHeight: 1.55, margin: '0 0 22px' }}>
        <Trans i18nKey="credenciamento.documentos.descricao" components={{ b: <strong /> }} />
      </p>
      <div style={{ display: 'grid', gap: 10 }}>
        {REQ_DOCS.map((d) => (
          <div
            key={d.nome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              padding: '14px 16px',
              border: '1px solid var(--border)',
              borderRadius: 11,
              background: '#fff',
            }}
          >
            {d.reuse ? (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'var(--sucesso-bg)',
                  color: 'var(--sucesso)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconeCheck width={18} height={18} strokeWidth={2.2} />
              </div>
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: 'var(--atencao-bg)',
                  color: '#8A5410',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </div>
            )}
            <div style={{ flex: 1, font: '600 14.5px var(--font-body)', color: 'var(--cinza-900)' }}>{d.nome}</div>
            {d.reuse ? (
              <span style={{ font: '600 12px var(--font-body)', color: 'var(--sucesso)' }}>
                {t('credenciamento.documentos.importado')}
              </span>
            ) : (
              <span style={{ font: '600 12px var(--font-body)', color: '#8A5410' }}>{t('credenciamento.documentos.necessarioEnviar')}</span>
            )}
          </div>
        ))}
      </div>

      {/* Upload dos documentos pendentes */}
      <div style={{ marginTop: 26 }}>
        <div
          style={{ font: '600 13.5px var(--font-body)', color: 'var(--azul-900)', margin: '0 0 12px' }}
        >
          {t('credenciamento.documentos.enviarPendentes')}
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {REQ_DOCS.filter((d) => !d.reuse).map((d) => (
            <div key={d.nome}>
              <div style={{ font: '600 13.5px var(--font-body)', color: 'var(--cinza-900)', marginBottom: 8 }}>
                {d.nome}
              </div>
              <div
                data-cy="upload-doc"
                style={{
                  border: '1.5px dashed var(--border)',
                  borderRadius: 12,
                  padding: 24,
                  textAlign: 'center',
                  background: 'var(--bg-page)',
                  cursor: 'default',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 11,
                    background: '#fff',
                    color: 'var(--azul-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <IconeUpload width={22} height={22} />
                </div>
                <div style={{ font: '600 14px var(--font-body)', color: 'var(--azul-800)' }}>
                  {t('credenciamento.documentos.arraste')}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--cinza-400)', marginTop: 3 }}>
                  {t('credenciamento.documentos.limite')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Passo 3: Termo de Aceite (RN016) ---------- */
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
function PassoSucesso({ onPainel }: { onPainel: () => void }) {
  const { t } = useTranslation();
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
          onClick={() => {
            /* no-op: geração de PDF será integrada posteriormente */
          }}
          style={{
            padding: '12px 22px',
            border: '1.5px solid var(--azul-700)',
            borderRadius: 10,
            background: '#fff',
            color: 'var(--azul-700)',
            font: '600 14.5px var(--font-body)',
            cursor: 'pointer',
          }}
        >
          {t('credenciamento.enviado.baixarPdf')}
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
