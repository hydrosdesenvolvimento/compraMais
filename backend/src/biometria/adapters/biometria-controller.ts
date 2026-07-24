import type { FastifyInstance } from 'fastify';
import type { Papel } from '../../shared/identity/identity-provider.js';
import { exigirPapel } from '../../shared/http/autenticacao.js';
import type { RegistrarBiometriaReferencia } from '../application/registrar-referencia.js';
import { FalhaCapturaFacial } from '../domain/biometria.js';

/** Só o responsável do próprio fornecedor cadastra sua referência biométrica. */
const PERFIS_FORNECEDOR: readonly Papel[] = ['titular', 'procurador'];

/**
 * Captura da referência biométrica no onboarding (UC007 · D4). O responsável envia a foto do rosto
 * (obrigatória) e o backend guarda o embedding cifrado. Sensível: só cadastra a PRÓPRIA empresa
 * (posse pelo token, AD-20). Falha de captura vira `codigo` = motivo (sem rosto/múltiplos/qualidade)
 * para o frontend orientar a correção; serviço fora do ar → 503 ("tente novamente").
 */
export function registrarRotasBiometria(app: FastifyInstance, deps: { registrar: RegistrarBiometriaReferencia }): void {
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
      const out = await deps.registrar.registrar({ fornecedorId: id, usuarioId: identidade.userId, imagem: decodificarImagem(imagem) });
      return reply.code(201).send({ status: 'ok', ...out });
    } catch (e) {
      if (e instanceof FalhaCapturaFacial) return reply.code(422).send({ codigo: e.motivo, mensagem: e.message });
      if ((e as Error).name === 'ReconhecimentoFacialIndisponivel') return reply.code(503).send({ codigo: 'ReconhecimentoFacialIndisponivel', mensagem: (e as Error).message });
      return reply.code(422).send({ codigo: (e as Error).name, mensagem: (e as Error).message });
    }
  });
}

/** Aceita data URL (`data:image/...;base64,XXXX`) ou base64 puro; devolve os bytes. */
export function decodificarImagem(imagem: string): Buffer {
  const b64 = imagem.startsWith('data:') ? (imagem.split(',', 2)[1] ?? '') : imagem;
  return Buffer.from(b64, 'base64');
}
