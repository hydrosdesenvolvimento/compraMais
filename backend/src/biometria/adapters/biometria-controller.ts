import type { FastifyInstance } from 'fastify';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';
import type { EnrolarFotoResponsavel } from '../application/enrolar-foto-responsavel.js';
import { FalhaCapturaFacial } from '../domain/biometria.js';

/** Só o responsável do próprio fornecedor cadastra sua referência biométrica. */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/**
 * Cadastro da foto de referência (UC007 · D4). O responsável envia a foto do rosto (obrigatória); o
 * backend a guarda como DOCUMENTO "Foto do Responsável" (vai à análise da CPL, UC006) e extrai o
 * embedding. Sensível: só a PRÓPRIA empresa (posse pelo token, AD-20). Falha de captura vira `codigo`
 * = motivo (sem rosto/múltiplos/qualidade); serviço fora do ar → 503 ("tente novamente").
 */
export function registrarRotasBiometria(app: FastifyInstance, deps: { enrolar: EnrolarFotoResponsavel }): void {
  app.post('/fornecedores/:id/biometria', async (req, reply) => {
    const identidade = exigirPapel(req, reply, PERFIS_FORNECEDOR);
    if (!identidade) return reply;
    const { id } = req.params as { id: string };
    if (identidade.empresaId && identidade.empresaId !== id) {
      return reply.code(404).send({ codigo: 'FornecedorNaoEncontrado', mensagem: 'Supplier not found.' });
    }
    const { imagem } = req.body as { imagem?: string };
    if (!imagem) return reply.code(422).send({ codigo: 'ImagemObrigatoria', mensagem: 'imagem (base64) is required.' });

    try {
      const { formato, conteudo } = partesImagem(imagem);
      const out = await deps.enrolar.enrolar({ fornecedorId: id, usuarioId: identidade.userId, formato, conteudo });
      return reply.code(201).send(out);
    } catch (e) {
      if (e instanceof FalhaCapturaFacial) return reply.code(422).send({ codigo: e.motivo, mensagem: e.message });
      if ((e as Error).name === 'ReconhecimentoFacialIndisponivel') return reply.code(503).send({ codigo: 'ReconhecimentoFacialIndisponivel', mensagem: (e as Error).message });
      return reply.code(422).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

/** Aceita data URL (`data:image/jpeg;base64,XXXX`) ou base64 puro; devolve os bytes. */
export function decodificarImagem(imagem: string): Buffer {
  return Buffer.from(partesImagem(imagem).conteudo, 'base64');
}

/** Separa a imagem em `{ formato: 'jpg'|'png', conteudo: base64 puro }` a partir do data URL (default jpg). */
export function partesImagem(imagem: string): { formato: string; conteudo: string } {
  if (!imagem.startsWith('data:')) return { formato: 'jpg', conteudo: imagem };
  const [cabecalho = '', dados = ''] = imagem.split(',', 2);
  const formato = /image\/png/i.test(cabecalho) ? 'png' : 'jpg';
  return { formato, conteudo: dados };
}
