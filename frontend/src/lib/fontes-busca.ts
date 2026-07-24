import { api, type CatalogoItemView } from './api';
import { filtrarPorTexto, type FonteBusca } from './busca-global';

/** Resolve a sigla (ou nome) da secretaria a partir do catálogo já carregado. */
function siglaDe(secretarias: CatalogoItemView[], id: string): string {
  const s = secretarias.find((x) => x.id === id);
  return s?.sigla ?? s?.nome ?? id;
}

/**
 * Fontes da busca global do Painel Admin. Cada fonte respeita o RBAC do seu endpoint por papel, para
 * não disparar chamadas que retornariam 403: editais (smga/cpl/administrador), fornecedores
 * (administrador/smga), documentos/análise (cpl/smga). Editais e fornecedores buscam no servidor
 * (`texto`/`busca`); a fila de análise não tem busca textual no backend, então filtra client-side.
 */
export function fontesBuscaAdmin(papel: string | undefined, secretarias: CatalogoItemView[]): FonteBusca[] {
  const fontes: FonteBusca[] = [];
  const p = papel ?? '';

  if (['smga', 'cpl', 'administrador'].includes(p)) {
    fontes.push({
      tipo: 'editais', href: '/admin/editais',
      buscar: async (termo) => (await api.buscarEditaisGestao({ texto: termo, size: 5 })).items.map((e) => ({
        id: e.id, titulo: `${e.numero} — ${e.objeto}`, subtitulo: siglaDe(secretarias, e.secretariaId),
      })),
    });
  }
  if (['administrador', 'smga'].includes(p)) {
    fontes.push({
      tipo: 'fornecedores', href: '/admin/fornecedores',
      buscar: async (termo) => (await api.fornecedoresAdminListar({ busca: termo, tamanho: 5 })).itens.map((f) => ({
        id: f.id, titulo: f.nomeFantasia || f.razaoSocial, subtitulo: f.cnpj,
      })),
    });
  }
  if (['cpl', 'smga'].includes(p)) {
    fontes.push({
      tipo: 'documentos', href: '/admin/analise-documental',
      buscar: async (termo) => filtrarPorTexto(await api.filaAnalise(), termo, (d) => [d.tipo, d.empresa, d.cnpj]).map((d) => ({
        id: d.id, titulo: d.tipo, subtitulo: d.empresa,
      })),
    });
  }
  return fontes;
}

/**
 * Fontes da busca global do Portal do Fornecedor — escopo da própria empresa (sem busca de fornecedores).
 * Editais compatíveis e documentos próprios não têm busca textual no backend; filtram client-side.
 */
export function fontesBuscaFornecedor(empresaId: string | undefined, secretarias: CatalogoItemView[]): FonteBusca[] {
  if (!empresaId) return [];
  return [
    {
      tipo: 'editais', href: '/editais',
      buscar: async (termo) => filtrarPorTexto(await api.editaisCompativeis(), termo, (e) => [e.numero, e.objeto, siglaDe(secretarias, e.secretariaId)]).map((e) => ({
        id: e.id, titulo: `${e.numero} — ${e.objeto}`, subtitulo: siglaDe(secretarias, e.secretariaId),
      })),
    },
    {
      tipo: 'documentos', href: '/documentos',
      buscar: async (termo) => filtrarPorTexto(await api.documentos(empresaId), termo, (d) => [d.tipo]).map((d) => ({
        id: d.id, titulo: d.tipo,
      })),
    },
  ];
}
