import type { FastifyInstance } from 'fastify';
import type { SolicitarCredenciamento, Actor } from '../application/solicitar-credenciamento.js';
import type { ListarCredenciamentos } from '../application/listar-credenciamentos.js';
import type { DetalharCredenciamento } from '../application/detalhar-credenciamento.js';
import type { GerarComprovanteCredenciamento } from '../application/gerar-comprovante-credenciamento.js';
import type { RegistrarProvaDeVidaNoCredenciamento } from '../application/registrar-prova-de-vida.js';
import { FalhaCapturaFacial } from '../../biometria/domain/biometria.js';
import { decodificarImagem } from '../../biometria/adapters/biometria-controller.js';
import type { Identidade, Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';
import { renderComprovantePdf } from './comprovante-pdf.js';

/** Papéis do próprio fornecedor autorizados a operar o credenciamento (dono do vínculo). */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/**
 * Controller do credenciamento (UC004). O fornecedor e o ator (rastro AD-30) vêm do JWT (AD-20):
 * a empresa representada é a do token, não mais um `x-empresa-id` escolhido pelo cliente — antes
 * um titular podia credenciar em nome de qualquer empresa só trocando o header.
 * Conclusão por Termo de Aceite (RN016) e cancelamento antes da distribuição (A2).
 */
export function registrarRotasCredenciamento(app: FastifyInstance, deps: { solicitar: SolicitarCredenciamento; listar: ListarCredenciamentos; detalhar: DetalharCredenciamento; comprovante: GerarComprovanteCredenciamento; provaVida: RegistrarProvaDeVidaNoCredenciamento }): void {
  // Leitura: credenciamentos do fornecedor para o portal. Somente "em andamento" por padrão (não
  // cancelados) — recorte da home; resolvido por `:id` como as demais rotas de leitura do fornecedor
  // (documentos). `?incluirCancelados=true` devolve o histórico completo, que a tela "Meus
  // Credenciamentos" precisa para o filtro de cancelados.
  app.get('/fornecedores/:id/credenciamentos', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { incluirCancelados } = req.query as { incluirCancelados?: string };
    return reply.send(await deps.listar.doFornecedor(id, { incluirCancelados: incluirCancelados === 'true' }));
  });

  // Detalhe read-only de um credenciamento (ação "Visualizar" da tela "Meus Credenciamentos"). A posse
  // é do dono do vínculo: a projeção só devolve se o credenciamento é da empresa do token (AD-20) —
  // fora disso, 404 (não vaza a existência do id para outra empresa).
  app.get('/credenciamentos/:id', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    const detalhe = await deps.detalhar.doFornecedor(id, empresaDe(identidade));
    if (!detalhe) return reply.code(404).send({ codigo: 'CredenciamentoNaoEncontrado', mensagem: 'Credenciamento not found.' });
    return reply.send(detalhe);
  });

  // Comprovante em PDF do credenciamento (UC004 · Passo Concluído — botão "Baixar PDF"). Documento
  // canônico do servidor: mesma posse do detalhe (só o dono do vínculo; fora disso 404, não vaza o id).
  // O corpo é o PDF (não o `{ codigo, mensagem }` das demais rotas), então o front baixa via Bearer
  // (ver `baixarArquivo`) em vez de navegar. `.pdf` no path é literal para o cliente sugerir o nome.
  app.get('/credenciamentos/:id/comprovante.pdf', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    const comprovante = await deps.comprovante.doFornecedor(id, empresaDe(identidade));
    if (!comprovante) return reply.code(404).send({ codigo: 'CredenciamentoNaoEncontrado', mensagem: 'Credenciamento not found.' });
    const pdf = renderComprovantePdf(comprovante);
    const nome = `comprovante-credenciamento-${(comprovante.numeroEdital ?? comprovante.protocolo).replace(/[^\w.-]+/g, '-')}.pdf`;
    return reply
      .header('content-type', 'application/pdf')
      .header('content-disposition', `attachment; filename="${nome}"`)
      .send(Buffer.from(pdf));
  });

  // Credenciamento ATIVO do fornecedor num edital (UC004 · retomada do wizard). O portal consulta na
  // entrada do wizard para reidratar o passo salvo em vez de recriar — sem isso, reentrar num edital já
  // iniciado esbarra em `CredenciamentoDuplicado` (409). 204 = nenhum vínculo ativo (pode começar do zero).
  // Posse pelo token (AD-20): só devolve o vínculo da empresa do chamador.
  app.get('/editais/:id/credenciamentos/meu', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id: editalId } = req.params as { id: string };
    const detalhe = await deps.detalhar.doFornecedorNoEdital(empresaDe(identidade), editalId);
    if (!detalhe) return reply.code(204).send();
    return reply.send(detalhe);
  });

  app.post('/editais/:id/credenciamentos', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id: editalId } = req.params as { id: string };
    const { capacidade } = req.body as { capacidade: number };
    try {
      const out = await deps.solicitar.iniciar(empresaDe(identidade), editalId, capacidade, ator(identidade));
      return reply.code(201).send({ ...out, estado: 'iniciado' });
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  // Passo 3 do wizard (UC007 · prova de vida): a captura ao vivo da webcam é comparada 1:1 com a
  // referência do cadastro. Aprova/reprova (não conclui nada) — o gate está no Termo. Falha de captura
  // vira `codigo` = motivo (sem rosto/múltiplos/qualidade) para o front orientar nova tentativa.
  app.post('/credenciamentos/:id/prova-de-vida', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    const { imagem } = req.body as { imagem?: string };
    if (!imagem) return reply.code(422).send({ codigo: 'ImagemObrigatoria', mensagem: 'imagem (base64) is required.' });
    try {
      const out = await deps.provaVida.executar(id, decodificarImagem(imagem), ator(identidade));
      return reply.send(out);
    } catch (e) {
      if (e instanceof FalhaCapturaFacial) return reply.code(422).send({ codigo: e.motivo, mensagem: e.message });
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.post('/credenciamentos/:id/termo', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    const { versaoTermo, finalidade } = req.body as { versaoTermo: string; finalidade: string };
    try {
      const out = await deps.solicitar.aceitarTermo(id, { versaoTermo, finalidade }, ator(identidade));
      return reply.send(out);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  // O wizard reporta o passo em que o fornecedor está (UC004) para "Meus Credenciamentos" mostrar
  // "Etapa n/N" e o "Continuar" retomar de onde parou. Mesmo perfil dono do vínculo das demais escritas.
  app.patch('/credenciamentos/:id/passo', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    const { passo } = req.body as { passo: number };
    try {
      const out = await deps.solicitar.registrarPasso(id, passo, ator(identidade));
      return reply.send(out);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });

  app.post('/credenciamentos/:id/cancelar', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    try {
      const out = await deps.solicitar.cancelar(id, ator(identidade));
      return reply.send(out);
    } catch (e) {
      return reply.code(erro(e)).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

/** Empresa representada pelo chamador — sempre a do token (AD-20). */
function empresaDe(id: Identidade): string {
  return id.empresaId ?? '';
}
function ator(id: Identidade): Actor {
  return { userId: id.userId, empresaId: empresaDe(id) };
}
function erro(e: unknown): number {
  const n = (e as Error).name;
  if (n === 'EditalIncompativel' || n === 'EditalNaoAberto') return 403;
  if (n === 'CredenciamentoNaoEncontrado' || n === 'FornecedorNaoEncontrado') return 404;
  if (n === 'ReconhecimentoFacialIndisponivel') return 503; // serviço facial fora do ar → "tente novamente"
  if (n === 'TransicaoCredenciamentoInvalida' || n === 'TransicaoStatusInvalida' || n === 'CredenciamentoJaDistribuido' || n === 'CredenciamentoDuplicado' || n === 'ProvaDeVidaPendente' || n === 'SemReferenciaBiometrica') return 409;
  return 422; // CapacidadeInvalida, TermoIncompleto, ModeloBiometricoIncompativel, etc.
}
