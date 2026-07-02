import type { FastifyInstance } from 'fastify';
import type { CadastrarFornecedor } from '../application/cadastrar-fornecedor.js';
import type { GerirConta } from '../application/gerir-conta.js';
import type { ReceitaGateway } from '../../shared/acl/receita/receita-gateway.js';
import type { CepGateway } from '../../shared/acl/cep/cep-gateway.js';

/**
 * Controller (camada de Adaptadores). Traduz HTTP ↔ casos de uso. Sem regra de negócio aqui.
 * Erros de domínio viram envelope { codigo, mensagem }. CNPJ e CEP consultam a BrasilAPI (via ACL).
 */
export function registrarRotasCadastro(app: FastifyInstance, deps: {
  cadastrar: CadastrarFornecedor;
  conta: GerirConta;
  receita: ReceitaGateway;
  cep: CepGateway;
}): void {
  app.post('/fornecedores/consulta-cnpj', async (req, reply) => {
    const { cnpj } = req.body as { cnpj: string };
    const r = await deps.receita.consultarCnpj(cnpj);
    if (r.frescor === 'indisponivel') {
      return reply.code(503).send({ codigo: 'RECEITA_INDISPONIVEL', mensagem: 'Receita unavailable — fill in manually', frescor: r.frescor });
    }
    return reply.send(r);
  });

  // Consulta de CEP (BrasilAPI) — autofill de endereço no cadastro/conta.
  app.get('/fornecedores/consulta-cep/:cep', async (req, reply) => {
    const { cep } = req.params as { cep: string };
    const r = await deps.cep.consultarCep(cep);
    if (!r.valor) {
      return reply.code(404).send({ codigo: 'CEP_NAO_ENCONTRADO', mensagem: 'CEP not found', frescor: r.frescor });
    }
    return reply.send(r);
  });

  app.post('/fornecedores', async (req, reply) => {
    try {
      const out = await deps.cadastrar.executar({ ...(req.body as object), ip: req.ip } as never);
      return reply.code(201).send(out);
    } catch (e) {
      return reply.code(mapStatus(e)).send({ codigo: nome(e), mensagem: (e as Error).message });
    }
  });

  app.patch('/fornecedores/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      await deps.conta.editarPerfil(id, req.body as Record<string, unknown>, { userId: actor(req) });
      return reply.code(204).send();
    } catch (e) {
      return reply.code(422).send({ codigo: nome(e), mensagem: (e as Error).message });
    }
  });

  app.post('/fornecedores/:id/sincronizar', async (req, reply) => {
    const { id } = req.params as { id: string };
    const r = await deps.conta.reSincronizar(id, { userId: actor(req) });
    return reply.send(r);
  });
}

function mapStatus(e: unknown): number {
  const n = nome(e);
  if (n === 'CnpjJaCadastrado') return 409;
  if (n === 'CnpjInvalido' || n === 'SituacaoNaoApta' || n === 'ConsentimentoInvalido') return 422;
  if (n === 'ReceitaIndisponivelSemManual') return 503;
  return 400;
}
function nome(e: unknown): string { return (e as Error)?.name ?? 'Erro'; }
function actor(req: { headers: Record<string, unknown> }): string {
  return String(req.headers['x-user-id'] ?? 'anon');
}
