import type { ComprovanteCredenciamento } from '../application/gerar-comprovante-credenciamento.js';

/**
 * Renderizador do comprovante de credenciamento (UC004 · Passo Concluído) em PDF, sem dependências: o
 * backend guarda um conjunto enxuto de libs de propósito e o `node_modules` durável é montado no
 * container (DEC-STR-34), então agregar um gerador de PDF forçaria rebuild da imagem. Um comprovante é
 * um documento de texto de layout fixo — cabe em um PDF 1.4 de uma página escrito à mão, com as fontes
 * padrão (Helvetica/Helvetica-Bold, não precisam ser embutidas) e codificação WinAnsi, que cobre os
 * acentos do PT-BR (cp1252). O idioma é PT-BR: é o idioma legal da licitação e o padrão dos documentos
 * de governança — um artefato canônico do servidor não passa pelo i18n do frontend.
 */

const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM = 56;

// Paleta alinhada ao Design System (azul-900/cinza) — o comprovante herda a identidade do portal.
const NAVY: RGB = [0.09, 0.2, 0.37];
const BRANCO: RGB = [1, 1, 1];
const ROTULO: RGB = [0.42, 0.45, 0.5];
const TEXTO: RGB = [0.1, 0.12, 0.16];
const LINHA: RGB = [0.85, 0.87, 0.9];

type RGB = readonly [number, number, number];

/** Rótulo PT-BR do estado do vínculo (o comprovante é emitido no Concluído, mas cobre os demais). */
const ESTADO_LABEL: Record<ComprovanteCredenciamento['estado'], string> = {
  iniciado: 'Em preenchimento',
  aceito: 'Pendente de Análise pela Comissão de Licitação',
  cancelado: 'Cancelado',
};

export function renderComprovantePdf(c: ComprovanteCredenciamento): Uint8Array {
  const ops: string[] = [];

  // Faixa de cabeçalho (marca) + título/subtítulo em branco.
  const faixaAltura = 92;
  retangulo(ops, 0, A4.altura - faixaAltura, A4.largura, faixaAltura, NAVY);
  texto(ops, MARGEM, A4.altura - 44, 19, 'F2', BRANCO, 'Comprovante de Credenciamento');
  texto(ops, MARGEM, A4.altura - 66, 10.5, 'F1', BRANCO, 'compraMais — Plataforma de Credenciamento e Compras Públicas');
  let y = A4.altura - faixaAltura - 34; // cursor de layout a partir do topo do corpo

  // Protocolo (id do vínculo) em destaque + estado atual.
  y = campo(ops, y, 'Protocolo', c.protocolo, { destaque: true });
  y = campo(ops, y, 'Situação', ESTADO_LABEL[c.estado]);
  y -= 6;

  // Edital.
  y = secao(ops, y, 'Edital');
  y = campo(ops, y, 'Número', c.numeroEdital ?? '—');
  y = campo(ops, y, 'Objeto', c.objeto ?? '—', { largura: A4.largura - MARGEM * 2 });
  y = campo(ops, y, 'Secretaria', c.secretariaSigla ?? '—');
  y -= 6;

  // Adesão (empresa + capacidade declarada, RN005).
  y = secao(ops, y, 'Adesão');
  if (c.fornecedor) {
    y = campo(ops, y, 'Razão social', c.fornecedor.razaoSocial, { largura: A4.largura - MARGEM * 2 });
    y = campo(ops, y, 'CNPJ', c.fornecedor.cnpj);
  }
  y = campo(ops, y, 'Capacidade declarada', `${c.capacidadeTeto} unidade(s)`);
  y -= 6;

  // Termo de Aceite (RN016) — só quando aceito.
  if (c.termo) {
    y = secao(ops, y, 'Termo de Aceite');
    y = campo(ops, y, 'Versão', c.termo.versao);
    y = campo(ops, y, 'Finalidade', c.termo.finalidade);
    y = campo(ops, y, 'Aceito em', formatarDataHora(c.termo.aceitoEm));
  }

  // Rodapé: filete + nota de emissão, ancorado ao pé da página — mas nunca acima do último bloco
  // (o `Math.min` com o cursor `y` evita sobreposição caso o conteúdo cresça).
  const rodapeRule = Math.min(y - 10, MARGEM + 42);
  retangulo(ops, MARGEM, rodapeRule, A4.largura - MARGEM * 2, 0.8, LINHA);
  texto(ops, MARGEM, rodapeRule - 16, 8.5, 'F1', ROTULO, `Documento gerado eletronicamente em ${formatarDataHora(c.geradoEm)}.`);
  texto(ops, MARGEM, rodapeRule - 28, 8.5, 'F1', ROTULO, 'Comprovante de submissão — não representa deferimento do credenciamento.');

  return montarPdf(ops.join('\n'));
}

/* ---------- Blocos de layout ---------- */

/** Título de seção (uppercase, com filete abaixo). Devolve o novo cursor Y. */
function secao(ops: string[], y: number, titulo: string): number {
  texto(ops, MARGEM, y, 11, 'F2', NAVY, titulo.toUpperCase());
  retangulo(ops, MARGEM, y - 7, A4.largura - MARGEM * 2, 0.8, LINHA);
  return y - 24;
}

/** Campo rótulo→valor. `largura` habilita quebra de linha (objeto/razão social longos). */
function campo(ops: string[], y: number, rotulo: string, valor: string, opts: { destaque?: boolean; largura?: number } = {}): number {
  texto(ops, MARGEM, y, 8, 'F1', ROTULO, rotulo.toUpperCase());
  const tamanho = opts.destaque ? 15 : 12;
  const fonte = opts.destaque ? 'F2' : 'F1';
  let cursor = y - 15;
  const linhas = opts.largura ? quebrar(valor, tamanho, opts.largura) : [valor];
  for (const linha of linhas) {
    texto(ops, MARGEM, cursor, tamanho, fonte, TEXTO, linha);
    cursor -= tamanho + 3;
  }
  return cursor - 8;
}

/* ---------- Primitivas de conteúdo ---------- */

function retangulo(ops: string[], x: number, y: number, w: number, h: number, [r, g, b]: RGB): void {
  ops.push(`${num(r)} ${num(g)} ${num(b)} rg`, `${num(x)} ${num(y)} ${num(w)} ${num(h)} re`, 'f');
}

function texto(ops: string[], x: number, y: number, tamanho: number, fonte: 'F1' | 'F2', [r, g, b]: RGB, str: string): void {
  ops.push('BT', `${num(r)} ${num(g)} ${num(b)} rg`, `/${fonte} ${num(tamanho)} Tf`, `${num(x)} ${num(y)} Td`, `(${escapar(str)}) Tj`, 'ET');
}

/** Aproxima a quebra por largura via largura média de caractere da Helvetica (~0,5em) — sem tabela AFM. */
function quebrar(texto: string, tamanho: number, largura: number): string[] {
  const maxChars = Math.max(1, Math.floor(largura / (tamanho * 0.5)));
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (tentativa.length > maxChars && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [''];
}

/**
 * Tipografia do bloco cp1252 0x80–0x9F (onde WinAnsi diverge do Latin-1): mapeia o code point Unicode
 * para o byte WinAnsi. Cobre travessão/meia-risca, aspas curvas, reticências, bullet etc., que aparecem
 * em texto de usuário (objeto do edital, razão social) e no próprio layout. Fora daqui o char cai no
 * ramo Latin-1 de `escapar`.
 */
const WINANSI_ESPECIAIS: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

/** Escapa para string literal PDF: barra/parênteses viram sequências; fora do WinAnsi (cp1252) vira '?'. */
function escapar(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '\\') out += '\\\\';
    else if (ch === '(') out += '\\(';
    else if (ch === ')') out += '\\)';
    else if (WINANSI_ESPECIAIS[code] !== undefined) out += String.fromCharCode(WINANSI_ESPECIAIS[code]);
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) out += ch; // Latin-1 = WinAnsi
    else out += '?'; // controle ou fora do WinAnsi
  }
  return out;
}

/** Números do content stream: no máximo 2 casas, sem notação científica. */
function num(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** ISO-8601 → `dd/mm/aaaa HH:MM` no fuso de Brasília; entrada inválida volta como está. */
function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

/* ---------- Montagem do arquivo PDF 1.4 ---------- */

/** Serializa catálogo, páginas, página, stream de conteúdo e as duas fontes padrão em um PDF válido. */
function montarPdf(conteudo: string): Uint8Array {
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(A4.largura)} ${num(A4.altura)}] ` +
      '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let corpo = '%PDF-1.4\n%âãÏÓ\n'; // comentário binário: marca o arquivo como binário
  const offsets: number[] = [];
  objetos.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(corpo, 'latin1'));
    corpo += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefPos = Buffer.byteLength(corpo, 'latin1');
  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(corpo + xref + trailer, 'latin1');
}
