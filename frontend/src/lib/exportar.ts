/**
 * Exportação client-side de listas (CSV/impressão). Não há endpoint de exportação no backend: o que
 * se exporta é exatamente o que o usuário vê (lista já filtrada e ordenada na tela).
 * Compartilhado pela Vitrine de Editais e por Meus Credenciamentos.
 */

/** Dispara o download de um arquivo gerado no cliente. */
export function baixar(conteudo: BlobPart, nome: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/** Escapa um campo para CSV (aspas duplicadas + envolvido em aspas). */
export const csvCampo = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/**
 * Monta e baixa um CSV. Usa `;` como separador (padrão pt-BR do Excel) e prefixa BOM (`\uFEFF`) para
 * que o Excel reconheça UTF-8 e não quebre a acentuação.
 */
export function exportarCsv(cabecalhos: string[], linhas: (string | number)[][], nomeArquivo: string): void {
  const conteudo = [
    cabecalhos.map(csvCampo).join(';'),
    ...linhas.map((l) => l.map(csvCampo).join(';')),
  ].join('\r\n');
  baixar(`\uFEFF${conteudo}`, nomeArquivo, 'text/csv;charset=utf-8');
}
