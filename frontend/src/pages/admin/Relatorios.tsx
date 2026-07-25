import { useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api, type CatalogoItemView, type TipoRelatorio } from '../../lib/api';
import { Botao, useToast } from '../../design-system/components';
import { cabecalho, celula } from '../../design-system/tabela';
import {
  TIPOS_RELATORIO, SUPORTA_SECRETARIA, rotuloTipo, descricaoTipo, rotuloColuna,
  formatarExibicao, exportarRelatorioJson, exportarRelatorioCsv, gerarRelatorioPdf,
} from '../../lib/relatorios';

/**
 * Painel Admin · "Relatórios" (perfil SMGA). Seis relatórios gerenciais dos processos, filtráveis por
 * período (data) e secretaria. Gera PDF (download direto, cabeçalho logo + título + emissão + período) e
 * exporta os dados brutos em JSON e CSV. O backend responde dado estruturado; a rotulação/formatação é aqui.
 */

const stat: CSSProperties = { minWidth: 120 };
const statLabel: CSSProperties = { fontSize: 12, color: 'var(--cinza-500)' };
const statValor: CSSProperties = { fontWeight: 700, fontSize: 20, color: 'var(--azul-900)', marginTop: 2 };

const MOEDA = ['valor', 'valorEstimado', 'valorDistribuido'];
const PERCENT = ['meiPercentual', 'percentual'];

export function Relatorios() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const locale = i18n.language;

  const [tipo, setTipo] = useState<TipoRelatorio>('editais');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [secretaria, setSecretaria] = useState('');
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const suportaSecretaria = SUPORTA_SECRETARIA.includes(tipo);

  const secretarias = useQuery({ queryKey: ['catalogo', 'secretarias'], queryFn: () => api.catalogoListar('secretarias'), staleTime: 5 * 60_000 });
  const secretariasLista = (secretarias.data as CatalogoItemView[] | undefined) ?? [];
  const siglaDe = (id: string): string => { const s = secretariasLista.find((x) => x.id === id); return s?.sigla ?? s?.nome ?? id; };

  const secretariaParam = suportaSecretaria && secretaria ? secretaria : undefined;
  const { data: rel, isLoading, isError, isFetching } = useQuery({
    queryKey: ['relatorio', tipo, de, ate, secretariaParam],
    queryFn: () => api.relatorio(tipo, { de: de || undefined, ate: ate || undefined, secretaria: secretariaParam }),
  });

  const temDados = !!rel && rel.linhas.length > 0;

  const textosPdf = useMemo(() => ({
    titulo: rotuloTipo(t, tipo),
    marca: t('common.brand.name', { defaultValue: 'Compra Mais' }),
    emissao: t('admin.relatorios.pdf.emissao'),
    periodo: t('admin.relatorios.pdf.periodo'),
    secretaria: t('admin.relatorios.pdf.secretaria'),
    todas: t('admin.relatorios.filtros.todas'),
    semDados: t('admin.relatorios.semDados'),
    paginaDe: (a: number, b: number) => t('admin.relatorios.pdf.pagina', { a, b }),
  }), [t, tipo]);

  async function baixarPdf() {
    if (!rel) return;
    setGerandoPdf(true);
    try {
      await gerarRelatorioPdf(rel, t, locale, textosPdf, secretariaParam ? siglaDe(secretariaParam) : undefined);
    } catch {
      toast.erro(t('admin.relatorios.erroPdf'));
    } finally {
      setGerandoPdf(false);
    }
  }

  function formatarTotal(chave: string, valor: number): string {
    if (PERCENT.includes(chave)) return `${valor}%`;
    if (MOEDA.includes(chave)) return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor);
    return new Intl.NumberFormat(locale).format(valor);
  }

  return (
    <div className="stack" data-cy="admin-relatorios">
      <div>
        <div style={{ fontSize: 12, color: 'var(--cinza-400)' }}>{t('admin.relatorios.eyebrow')}</div>
        <h1 className="page-title">{t('admin.relatorios.titulo')}</h1>
        <p className="page-sub">{t('admin.relatorios.subtitulo')}</p>
      </div>

      {/* Seletor de relatório */}
      <div data-cy="seletor-relatorio" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TIPOS_RELATORIO.map((tp) => {
          const ativo = tp === tipo;
          return (
            <button
              key={tp}
              data-cy={`tipo-${tp}`}
              onClick={() => setTipo(tp)}
              aria-pressed={ativo}
              title={descricaoTipo(t, tp)}
              style={{
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                border: `1px solid ${ativo ? 'var(--azul-800)' : 'var(--border)'}`,
                background: ativo ? 'var(--azul-800)' : '#fff', color: ativo ? '#fff' : 'var(--cinza-700)',
              }}
            >
              {rotuloTipo(t, tp)}
            </button>
          );
        })}
      </div>
      <p className="page-sub" data-cy="descricao-relatorio" style={{ marginTop: -6 }}>{descricaoTipo(t, tipo)}</p>

      {/* Filtros: período + secretaria */}
      <div data-cy="filtros" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={statLabel}>{t('admin.relatorios.filtros.de')}</span>
          <input data-cy="filtro-de" type="date" className="input" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={statLabel}>{t('admin.relatorios.filtros.ate')}</span>
          <input data-cy="filtro-ate" type="date" className="input" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={statLabel}>{t('admin.relatorios.pdf.secretaria')}</span>
          <select data-cy="filtro-secretaria" className="input" value={secretaria} disabled={!suportaSecretaria} onChange={(e) => setSecretaria(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">{t('admin.relatorios.filtros.todas')}</option>
            {secretariasLista.map((s) => <option key={s.id} value={s.id}>{s.sigla ?? s.nome}</option>)}
          </select>
        </label>
        {(de || ate || secretaria) && (
          <Botao data-cy="limpar-filtros" variante="secundario" onClick={() => { setDe(''); setAte(''); setSecretaria(''); }}>
            {t('admin.relatorios.filtros.limpar')}
          </Botao>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Botao data-cy="exportar-pdf" onClick={baixarPdf} disabled={!temDados || gerandoPdf}>
            {gerandoPdf ? t('admin.relatorios.gerandoPdf') : t('admin.relatorios.exportar.pdf')}
          </Botao>
          <Botao data-cy="exportar-csv" variante="secundario" onClick={() => rel && exportarRelatorioCsv(rel, t)} disabled={!temDados}>
            {t('admin.relatorios.exportar.csv')}
          </Botao>
          <Botao data-cy="exportar-json" variante="secundario" onClick={() => rel && exportarRelatorioJson(rel)} disabled={!temDados}>
            {t('admin.relatorios.exportar.json')}
          </Botao>
        </div>
      </div>

      {isLoading || isFetching ? (
        <p data-cy="carregando" className="page-sub">{t('admin.relatorios.carregando')}</p>
      ) : isError ? (
        <p data-cy="erro" role="alert" style={{ color: 'var(--erro, #c0392b)' }}>{t('admin.relatorios.erroCarregar')}</p>
      ) : rel ? (
        <>
          {/* Totais */}
          {Object.keys(rel.totais).length > 0 && (
            <div data-cy="totais" className="card" style={{ display: 'flex', gap: 28, flexWrap: 'wrap', padding: '18px 22px' }}>
              {Object.entries(rel.totais).map(([chave, valor]) => (
                <div key={chave} style={stat}>
                  <div style={statLabel}>{t(`admin.relatorios.totais.${chave}`, { defaultValue: chave })}</div>
                  <div style={statValor} data-cy={`total-${chave}`}>{formatarTotal(chave, valor)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Prévia dos dados */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {rel.linhas.length === 0 ? (
              <div data-cy="sem-dados" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--cinza-500)' }}>{t('admin.relatorios.semDados')}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {rel.colunas.map((c) => (
                        <th key={c.chave} scope="col" style={cabecalho(false, c.tipo === 'moeda' || c.tipo === 'numero' ? 'right' : 'left')}>
                          {rotuloColuna(t, c.chave)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rel.linhas.map((linha, i) => (
                      <tr key={i} data-cy="linha-relatorio">
                        {rel.colunas.map((c) => (
                          <td key={c.chave} style={{ ...celula, textAlign: c.tipo === 'moeda' || c.tipo === 'numero' ? 'right' : 'left', whiteSpace: c.tipo === 'texto' ? 'normal' : 'nowrap', fontVariantNumeric: 'tabular-nums', color: 'var(--cinza-700)' }}>
                            {formatarExibicao(linha[c.chave], c.tipo, t, locale)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
