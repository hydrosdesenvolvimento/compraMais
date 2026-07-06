import type { CSSProperties } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import { IconeAlerta, IconeRelogio, IconeSeta } from '../../design-system/icons';

/* ---- Dados de demonstração (do mockup) ---- */
const empresa = { nome: 'Vale do Acre Uniformes', cnpj: '12.345.678/0001-90', cidade: 'Rio Branco' };

const prazoUrgente: CSSProperties = { color: 'var(--erro-700)', background: 'var(--erro-bg)' };
const prazoAtencao: CSSProperties = { color: '#8A5410', background: 'var(--atencao-bg)' };
const prazoNormal: CSSProperties = { color: 'var(--sucesso)', background: 'var(--sucesso-bg)' };

interface Edital {
  num: string;
  sec: string;
  objeto: string;
  prazoText: string;
  prazoStyle: CSSProperties;
}

const dashEditais: Edital[] = [
  {
    num: 'CR nº 004/2026',
    sec: 'SEDUC',
    objeto: 'Fardamento escolar — rede municipal de ensino',
    prazoText: 'Encerra em 2 dias',
    prazoStyle: prazoUrgente,
  },
  {
    num: 'CR nº 007/2026',
    sec: 'SESACRE',
    objeto: 'Vestuário hospitalar e EPIs têxteis',
    prazoText: 'Encerra em 6 dias',
    prazoStyle: prazoAtencao,
  },
  {
    num: 'CR nº 011/2026',
    sec: 'SEJUSP',
    objeto: 'Uniformes operacionais e coletes',
    prazoText: 'Encerra em 12 dias',
    prazoStyle: prazoNormal,
  },
];

interface Credenciamento {
  num: string;
  status: string;
  objeto: string;
  sec: string;
  tagStyle: CSSProperties;
}

const credAndamento: Credenciamento[] = [
  {
    num: 'CR nº 002/2026',
    status: 'Em análise',
    objeto: 'Fardamento administrativo — servidores',
    sec: 'Secretaria de Administração (SEAD)',
    tagStyle: { color: 'var(--info)', background: 'var(--info-bg)' },
  },
  {
    num: 'CR nº 003/2026',
    status: 'Aguardando documento',
    objeto: 'Uniformes de agentes comunitários de saúde',
    sec: 'Secretaria de Saúde (SESACRE)',
    tagStyle: { color: '#8A5410', background: 'var(--atencao-bg)' },
  },
];

const secTagStyle: CSSProperties = {
  font: '600 9.5px var(--font-body)',
  letterSpacing: '.06em',
  color: 'var(--cinza-500)',
  background: 'var(--cinza-100)',
  padding: '2px 7px',
  borderRadius: 5,
};

export function Inicio() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goDocs = () => navigate({ to: '/documentos' });
  const goEditais = () => navigate({ to: '/editais' });
  const goCredenciamento = () => navigate({ to: '/credenciamento' });
  const goMeusCred = () => navigate({ to: '/contestacao' });

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: '12.5px', color: 'var(--cinza-400)' }}>Quinta-feira, 25 de junho de 2026</div>
          <h1 style={{ fontWeight: 600, fontSize: 22, color: 'var(--azul-900)', margin: '6px 0 3px' }}>
            {t('inicio.cabecalho.bemVindo', { nome: empresa.nome })}
          </h1>
          <div style={{ fontSize: '13.5px', color: 'var(--cinza-500)' }}>
            {t('inicio.cabecalho.cnpjCidade', { cnpj: empresa.cnpj, cidade: empresa.cidade })}
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 14px',
            borderRadius: 999,
            background: 'var(--info-bg)',
            border: '1px solid var(--azul-100)',
            color: 'var(--azul-700)',
            font: '600 12.5px var(--font-body)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--azul-600)' }} />
          {t('inicio.cabecalho.statusCredenciado')}
        </div>
      </div>

      {/* Alertas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Alerta erro */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            background: '#fff',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--erro)',
            borderRadius: 12,
            padding: '16px 20px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--erro-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--erro-700)',
            }}
          >
            <IconeAlerta width={20} height={20} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>{t('inicio.alertaErro.titulo', { count: 2 })}</span>
              <span style={{ font: '600 11px var(--font-body)', color: '#fff', background: 'var(--erro)', padding: '2px 9px', borderRadius: 999 }}>2</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--cinza-500)', marginTop: 2 }}>
              <Trans i18nKey="inicio.alertaErro.descricao" components={{ b: <strong style={{ color: 'var(--erro-700)' }} /> }} />
            </div>
          </div>
          <button
            onClick={goDocs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 8,
              background: 'var(--erro)',
              color: '#fff',
              font: '600 13.5px var(--font-body)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t('inicio.alertaErro.botao')}
            <IconeSeta width={15} height={15} />
          </button>
        </div>

        {/* Alerta atenção */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            background: '#fff',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--atencao)',
            borderRadius: 12,
            padding: '16px 20px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'var(--atencao-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#8A5410',
            }}
          >
            <IconeRelogio width={20} height={20} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ font: '600 14.5px var(--font-body)', color: 'var(--azul-900)' }}>{t('inicio.alertaAtencao.titulo')}</div>
            <div style={{ fontSize: 13, color: 'var(--cinza-500)', marginTop: 2 }}>
              <Trans
                i18nKey="inicio.alertaAtencao.descricao"
                values={{ dias: 5, data: '30/06/2026' }}
                components={{ b: <strong style={{ color: '#8A5410' }} />, c: <strong /> }}
              />
            </div>
          </div>
          <button
            onClick={goDocs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              border: 'none',
              borderRadius: 8,
              background: 'var(--azul-700)',
              color: '#fff',
              font: '600 13.5px var(--font-body)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t('inicio.alertaAtencao.botao')}
            <IconeSeta width={15} height={15} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="cm-grid-4" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{t('inicio.kpis.editaisCompativeis')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 26, color: 'var(--azul-900)', lineHeight: 1 }}>3</span>
            <span style={{ font: '600 11px var(--font-body)', color: 'var(--sucesso)', background: 'var(--sucesso-bg)', padding: '3px 8px', borderRadius: 999 }}>{t('inicio.kpis.novos')}</span>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{t('inicio.kpis.credenciamentosAndamento')}</div>
          <div style={{ fontWeight: 600, fontSize: 26, color: 'var(--azul-900)', lineHeight: 1, marginTop: 10 }}>2</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{t('inicio.kpis.documentosAprovados')}</div>
          <div style={{ fontWeight: 600, fontSize: 26, color: 'var(--azul-900)', lineHeight: 1, marginTop: 10 }}>
            4<span style={{ fontSize: 16, color: 'var(--cinza-400)', fontWeight: 500 }}>/6</span>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ fontSize: 13, color: 'var(--cinza-500)' }}>{t('inicio.kpis.demandaDistribuida')}</div>
          <div style={{ fontWeight: 600, fontSize: 26, color: 'var(--azul-900)', lineHeight: 1, marginTop: 10 }}>1</div>
        </div>
      </div>

      {/* Painéis */}
      <div className="cm-grid-2" style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Editais abertos compatíveis */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ font: '600 16px var(--font-display)', color: 'var(--azul-900)' }}>{t('inicio.painelEditais.titulo')}</div>
            <button
              onClick={goEditais}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                font: '600 13px var(--font-body)',
                color: 'var(--azul-700)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {t('inicio.painelEditais.verTodos')}
              <IconeSeta width={15} height={15} />
            </button>
          </div>
          {dashEditais.map((e) => (
            <div key={e.num} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: '600 13px var(--font-body)', color: 'var(--azul-700)' }}>{e.num}</span>
                  <span style={secTagStyle}>{e.sec}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-title)', marginTop: 4 }}>{e.objeto}</div>
              </div>
              <span style={{ ...e.prazoStyle, font: '600 11.5px var(--font-body)', padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                {e.prazoText}
              </span>
              <button
                onClick={goCredenciamento}
                style={{
                  padding: '9px 14px',
                  border: '1.5px solid var(--azul-700)',
                  borderRadius: 8,
                  background: '#fff',
                  color: 'var(--azul-700)',
                  font: '600 13px var(--font-body)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background .12s,color .12s',
                }}
              >
                {t('inicio.painelEditais.iniciar')}
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 20px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--cinza-500)' }}>{t('inicio.painelEditais.mostrando', { atual: 3, total: 3 })}</span>
          </div>
        </div>

        {/* Credenciamentos em andamento */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--divider)', font: '600 16px var(--font-display)', color: 'var(--azul-900)' }}>
            {t('inicio.painelCredenciamentos.titulo')}
          </div>
          {credAndamento.map((c) => (
            <div key={c.num} style={{ padding: '15px 20px', borderBottom: '1px solid var(--divider)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ font: '600 13px var(--font-body)', color: 'var(--azul-700)' }}>{c.num}</span>
                <span style={{ ...c.tagStyle, font: '600 11px var(--font-body)', padding: '4px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                  {c.status}
                </span>
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-title)', marginTop: 5 }}>{c.objeto}</div>
              <div style={{ fontSize: 12, color: 'var(--cinza-400)', marginTop: 2 }}>{c.sec}</div>
            </div>
          ))}
          <div style={{ padding: '16px 20px' }}>
            <button
              onClick={goMeusCred}
              style={{
                width: '100%',
                padding: 10,
                border: '1.5px solid var(--azul-700)',
                borderRadius: 9,
                background: '#fff',
                color: 'var(--azul-700)',
                font: '600 13.5px var(--font-body)',
                cursor: 'pointer',
                transition: 'background .12s,color .12s',
              }}
            >
              {t('inicio.painelCredenciamentos.verMeus')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
