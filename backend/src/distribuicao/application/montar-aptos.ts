import type { AptoDistribuicao } from '../domain/motor.js';
import type { CredenciamentoRepository } from '../../credenciamento/application/solicitar-credenciamento.js';
import type { FornecedorRepository } from '../../catalogo/application/fornecedor-repository.js';

/**
 * Reúne os aptos de um edital para o Motor (UC008 / RF005): credenciados `aceito`, cada um com seu
 * teto declarado (RN005) e os desempates (ordem de credenciamento → CNPJ). Compartilhado entre a
 * execução que congela a matriz (`ExecutarDistribuicao`) e o resumo/preview da tela de gestão
 * (`ResumoDistribuicaoEdital`), garantindo que o preview seja idêntico ao que será homologado.
 */
export async function montarAptosDoEdital(
  creds: CredenciamentoRepository,
  fornecedores: FornecedorRepository,
  editalId: string,
): Promise<AptoDistribuicao[]> {
  const aceitos = (await creds.listarPorEdital(editalId)).filter((c) => c.situacao === 'aceito');
  const aptos: AptoDistribuicao[] = [];
  for (const c of aceitos) {
    const f = await fornecedores.porId(c.fornecedorId);
    aptos.push({
      id: c.fornecedorId,
      teto: c.capacidadeTeto, // teto declarado (RN005)
      ordemCredenciamento: Date.parse(c.registerDate), // ordem de credenciamento — desempate primário (§8)
      cnpj: f?.cnpj.valor ?? c.fornecedorId, // desempate secundário; fallback estável se o fornecedor sumiu
    });
  }
  return aptos;
}

/**
 * Aptos de UM item do edital (Fase 2 — rateio por item): apenas os credenciados `aceito` que
 * DECLARARAM capacidade nesse item, cada um com o teto do item (RN005). Credenciamentos legados
 * nível-edital (sem itens) não participam do rateio por item.
 */
export async function montarAptosDoItem(
  creds: CredenciamentoRepository,
  fornecedores: FornecedorRepository,
  editalId: string,
  itemId: string,
): Promise<AptoDistribuicao[]> {
  const aceitos = (await creds.listarPorEdital(editalId)).filter((c) => c.situacao === 'aceito');
  const aptos: AptoDistribuicao[] = [];
  for (const c of aceitos) {
    const declarado = c.itens.find((i) => i.itemId === itemId);
    if (!declarado) continue; // não declarou capacidade neste item
    const f = await fornecedores.porId(c.fornecedorId);
    aptos.push({
      id: c.fornecedorId,
      teto: declarado.capacidadeTeto, // teto declarado PARA o item (RN005)
      ordemCredenciamento: Date.parse(c.registerDate),
      cnpj: f?.cnpj.valor ?? c.fornecedorId,
    });
  }
  return aptos;
}
