/**
 * Relatórios gerenciais (perfil SMGA) — camada de apresentação/exportação no cliente.
 *
 * O backend responde dado estruturado ({ colunas, linhas, totais }) com CHAVES estáveis; aqui ficam a
 * localização dos rótulos/valores, a geração do PDF (download direto, com cabeçalho logo + título +
 * data de emissão + período) e as exportações de dados brutos em JSON e CSV.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TFunction } from 'i18next';
import type { RelatorioView, TipoRelatorio, TipoColunaRelatorio } from './api';
import { baixar, exportarCsv } from './exportar';
import logoUrl from '../design-system/image/logoCompraMais.png';

/** Ordem de exibição dos relatórios no seletor. */
export const TIPOS_RELATORIO: TipoRelatorio[] = ['editais', 'distribuicoes', 'cotas', 'credenciados', 'participacao', 'bloqueios'];

/** Relatórios com dimensão de secretaria (habilita o filtro). Espelha `suportaSecretaria` do backend. */
export const SUPORTA_SECRETARIA: readonly TipoRelatorio[] = ['editais', 'distribuicoes', 'cotas'];

export const rotuloTipo = (t: TFunction, tipo: TipoRelatorio) => t(`admin.relatorios.tipos.${tipo}.titulo`);
export const descricaoTipo = (t: TFunction, tipo: TipoRelatorio) => t(`admin.relatorios.tipos.${tipo}.descricao`);
export const rotuloColuna = (t: TFunction, chave: string) => t(`admin.relatorios.colunas.${chave}`, { defaultValue: chave });

/** Data a partir da porção YYYY-MM-DD, ancorada ao meio-dia local para não deslocar por fuso. */
function dataLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

/** Valor formatado para EXIBIÇÃO (tela e PDF): datas localizadas, moeda BRL, números com separador, enums traduzidos. */
export function formatarExibicao(v: unknown, tipo: TipoColunaRelatorio, t: TFunction, locale: string): string {
  if (v === null || v === undefined || v === '') return '—';
  switch (tipo) {
    case 'data': return dataLocal(String(v)).toLocaleDateString(locale);
    case 'moeda': return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(Number(v));
    case 'numero': return new Intl.NumberFormat(locale).format(Number(v));
    default: return t(`admin.relatorios.valores.${v}`, { defaultValue: String(v) });
  }
}

/** Valor para CSV (dados brutos, amigável a planilha): números/moeda como número puro; datas ISO curtas; enums traduzidos. */
function valorCsv(v: unknown, tipo: TipoColunaRelatorio, t: TFunction): string | number {
  if (v === null || v === undefined) return '';
  switch (tipo) {
    case 'moeda':
    case 'numero': return Number(v);
    case 'data': return String(v).slice(0, 10);
    default: return t(`admin.relatorios.valores.${v}`, { defaultValue: String(v) });
  }
}

/** Nome de arquivo estável: relatorio-<tipo>-<AAAA-MM-DD>.<ext> (data de emissão). */
function nomeArquivo(rel: RelatorioView, ext: string): string {
  return `relatorio-${rel.tipo}-${rel.geradoEm.slice(0, 10)}.${ext}`;
}

// --------------------------------------------------------------------------- //
// Exportações de dados brutos                                                  //
// --------------------------------------------------------------------------- //

/** JSON: payload cru do backend (dado bruto), com envelope de contexto. */
export function exportarRelatorioJson(rel: RelatorioView): void {
  const payload = {
    tipo: rel.tipo, geradoEm: rel.geradoEm, periodo: rel.periodo, secretariaId: rel.secretariaId,
    totais: rel.totais, colunas: rel.colunas, linhas: rel.linhas,
  };
  baixar(JSON.stringify(payload, null, 2), nomeArquivo(rel, 'json'), 'application/json;charset=utf-8');
}

/** CSV: cabeçalhos localizados + valores brutos por coluna. */
export function exportarRelatorioCsv(rel: RelatorioView, t: TFunction): void {
  const cabecalhos = rel.colunas.map((c) => rotuloColuna(t, c.chave));
  const linhas = rel.linhas.map((linha) => rel.colunas.map((c) => valorCsv(linha[c.chave], c.tipo, t)));
  exportarCsv(cabecalhos, linhas, nomeArquivo(rel, 'csv'));
}

// --------------------------------------------------------------------------- //
// PDF                                                                          //
// --------------------------------------------------------------------------- //

let logoCache: string | null | undefined;
/** Carrega o logo do sistema como data URL (cache) para embutir no cabeçalho do PDF. */
async function carregarLogo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const resp = await fetch(logoUrl);
    const blob = await resp.blob();
    logoCache = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  } catch {
    logoCache = null; // sem logo, o PDF ainda é gerado (cabeçalho textual)
  }
  return logoCache;
}

export interface TextosPdf {
  titulo: string;      // título do relatório
  marca: string;       // nome do sistema (fallback textual do logo)
  emissao: string;     // rótulo "Emitido em"
  periodo: string;     // rótulo "Período"
  secretaria: string;  // rótulo "Secretaria"
  todas: string;       // "Todas" (secretaria não filtrada)
  semDados: string;    // linha vazia
  paginaDe: (a: number, b: number) => string; // "Página a de b"
}

/**
 * Gera e baixa o PDF do relatório. Cabeçalho: logo do sistema + título + data de emissão + período dos
 * dados (e secretaria, quando aplicável). Corpo: tabela com as colunas/linhas já formatadas.
 */
export async function gerarRelatorioPdf(
  rel: RelatorioView,
  t: TFunction,
  locale: string,
  textos: TextosPdf,
  secretariaLabel?: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margem = 40;
  const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
  const logo = await carregarLogo();

  // Cabeçalho ------------------------------------------------------------------
  const y = margem;
  if (logo) {
    try { doc.addImage(logo, 'PNG', margem, y, 132, 34); } catch { /* imagem inválida: segue textual */ }
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(11, 74, 139);
    doc.text(textos.marca, margem, y + 22);
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(20, 30, 50);
  doc.text(textos.titulo, margem, y + 62);

  const emissao = new Date(rel.geradoEm).toLocaleString(locale);
  const de = rel.periodo.de ? dataLocal(rel.periodo.de).toLocaleDateString(locale) : '—';
  const ate = rel.periodo.ate ? dataLocal(rel.periodo.ate).toLocaleDateString(locale) : '—';
  const secretaria = rel.suportaSecretaria ? (secretariaLabel || textos.todas) : '—';
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(90, 100, 120);
  doc.text(`${textos.emissao}: ${emissao}`, margem, y + 80);
  doc.text(`${textos.periodo}: ${de} — ${ate}`, margem, y + 94);
  if (rel.suportaSecretaria) doc.text(`${textos.secretaria}: ${secretaria}`, margem, y + 108);

  // Tabela ---------------------------------------------------------------------
  const head = [rel.colunas.map((c) => rotuloColuna(t, c.chave))];
  const body = rel.linhas.length
    ? rel.linhas.map((linha) => rel.colunas.map((c) => formatarExibicao(linha[c.chave], c.tipo, t, locale)))
    : [[textos.semDados, ...rel.colunas.slice(1).map(() => '')]];
  const alinhamentoDireita = rel.colunas.reduce<Record<number, { halign: 'right' }>>((acc, c, i) => {
    if (c.tipo === 'moeda' || c.tipo === 'numero') acc[i] = { halign: 'right' };
    return acc;
  }, {});

  autoTable(doc, {
    startY: y + (rel.suportaSecretaria ? 122 : 108),
    head, body,
    styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [11, 74, 139], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 247, 251] },
    columnStyles: alinhamentoDireita,
    margin: { left: margem, right: margem },
    tableWidth: larguraUtil,
    didDrawPage: (dados) => {
      const total = doc.getNumberOfPages();
      doc.setFontSize(8); doc.setTextColor(140, 150, 165);
      doc.text(textos.paginaDe(dados.pageNumber, total), doc.internal.pageSize.getWidth() - margem, doc.internal.pageSize.getHeight() - 18, { align: 'right' });
    },
  });

  doc.save(nomeArquivo(rel, 'pdf'));
}
