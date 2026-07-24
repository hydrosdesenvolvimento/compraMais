/**
 * Busca global da topbar (editais, documentos, fornecedores). Cada shell (admin/fornecedor) fornece
 * suas próprias fontes, respeitando o escopo/RBAC do perfil — o componente `BuscaGlobal` só orquestra.
 */

export type TipoBusca = 'editais' | 'documentos' | 'fornecedores';

/** Item de resultado normalizado (o texto já vem pronto para exibir; sem lógica de i18n aqui). */
export interface ItemBusca {
  id: string;
  titulo: string;
  subtitulo?: string;
}

/** Fonte de busca: um domínio pesquisável, sua rota-alvo e a função que executa a busca. */
export interface FonteBusca {
  tipo: TipoBusca;
  /** Rota para onde o clique leva (também a chave do prefill da busca na página-alvo). */
  href: string;
  buscar: (termo: string) => Promise<ItemBusca[]>;
}

/**
 * Prefill efêmero: ao clicar num resultado, guardamos o termo por rota-alvo para a página abrir já
 * filtrada. Não persiste (é estado de navegação) — a página consome e limpa no mount. Evita reescrever
 * as rotas com search params só para carregar o termo.
 */
const pendentes = new Map<string, string>();

export function definirBuscaPendente(rota: string, termo: string): void {
  const t = termo.trim();
  if (t) pendentes.set(rota, t);
}

/** Lê e remove o termo pendente da rota (usar no inicializador de `useState` da página-alvo). */
export function consumirBuscaPendente(rota: string): string {
  const v = pendentes.get(rota) ?? '';
  pendentes.delete(rota);
  return v;
}

/** Filtro client-side reutilizável (para fontes sem busca textual no backend). */
export function filtrarPorTexto<T>(itens: T[], termo: string, campos: (item: T) => Array<string | null | undefined>, limite = 5): T[] {
  const t = termo.trim().toLowerCase();
  if (!t) return [];
  return itens.filter((i) => campos(i).some((c) => (c ?? '').toLowerCase().includes(t))).slice(0, limite);
}
