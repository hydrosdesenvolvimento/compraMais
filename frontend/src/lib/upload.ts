/**
 * Utilitários de upload de documentos comprobatórios (FR-002). Compartilhados entre a tela de
 * repositório (`/documentos`) e o Passo 2 do wizard de credenciamento (UC004) — ambos enviam para o
 * mesmo endpoint cifrado (`POST /fornecedores/:id/documentos`) e aceitam o mesmo conjunto de formatos.
 * O backend valida o mesmo conjunto (FormatoInvalido); manter as duas pontas alinhadas evita rejeição.
 */

/** Formatos aceitos no upload (pdf|jpg|png) — o backend valida o mesmo conjunto. */
export type FormatoDoc = 'pdf' | 'jpg' | 'png';

/** Tamanho máximo por arquivo no upload (RF002 — "acima do limite é rejeitado com mensagem clara"). */
export const TAMANHO_MAX_MB = 10;

/** MIME por formato, para montar o data URL de preview/download a partir do base64 do backend. */
export const MIME: Record<FormatoDoc, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' };

/** Extrai o formato aceito a partir da extensão do arquivo (jpeg é normalizado para jpg). */
export function formatoDe(nome: string): FormatoDoc | null {
  const ext = nome.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
  if (ext === 'png') return 'png';
  return null;
}

/** Lê o arquivo como base64 puro (sem o prefixo `data:...;base64,`) para trafegar no JSON. */
export function lerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error ?? new Error('read error'));
    r.readAsDataURL(file);
  });
}
