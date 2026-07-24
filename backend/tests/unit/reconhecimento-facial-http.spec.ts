import { describe, it, expect } from 'vitest';
import {
  ReconhecimentoFacialHttpGateway,
  ReconhecimentoFacialIndisponivel,
} from '../../src/shared/acl/facial/reconhecimento-facial-http.js';

/** fetch fake: responde com um Response real (undici) a partir do corpo/estado dados. */
function fetchQueResponde(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}
function fetchQueFalha(msg: string): typeof fetch {
  return (async () => {
    throw new Error(msg);
  }) as unknown as typeof fetch;
}

const IMG = Buffer.from('imagem-jpeg-fake');

describe('ReconhecimentoFacialHttpGateway', () => {
  it('mapeia sucesso do serviço em template tipado', async () => {
    const gw = new ReconhecimentoFacialHttpGateway({
      baseUrl: 'http://face:8000/',
      fetchImpl: fetchQueResponde({ ok: true, template: { vetor: [0.1, 0.2], dim: 2, modelo: 'arcface-buffalo_l' }, qualidade: 0.9 }),
    });
    const r = await gw.extrairTemplate(IMG);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.template.vetor).toEqual([0.1, 0.2]);
      expect(r.template.modelo).toBe('arcface-buffalo_l');
      expect(r.qualidade).toBe(0.9);
    }
  });

  it('mapeia falha de negócio (ok:false) em motivo tipado', async () => {
    const gw = new ReconhecimentoFacialHttpGateway({ baseUrl: 'http://face:8000', fetchImpl: fetchQueResponde({ ok: false, motivo: 'multiplos_rostos' }) });
    const r = await gw.extrairTemplate(IMG);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toBe('multiplos_rostos');
  });

  it('motivo desconhecido → Indisponivel (não vira "reprovado")', async () => {
    const gw = new ReconhecimentoFacialHttpGateway({ baseUrl: 'http://face:8000', fetchImpl: fetchQueResponde({ ok: false, motivo: 'gato_detectado' }) });
    await expect(gw.extrairTemplate(IMG)).rejects.toBeInstanceOf(ReconhecimentoFacialIndisponivel);
  });

  it('HTTP não-2xx → Indisponivel', async () => {
    const gw = new ReconhecimentoFacialHttpGateway({ baseUrl: 'http://face:8000', fetchImpl: fetchQueResponde({ erro: 'boom' }, 500) });
    await expect(gw.extrairTemplate(IMG)).rejects.toBeInstanceOf(ReconhecimentoFacialIndisponivel);
  });

  it('erro de transporte (serviço fora do ar) → Indisponivel', async () => {
    const gw = new ReconhecimentoFacialHttpGateway({ baseUrl: 'http://face:8000', fetchImpl: fetchQueFalha('ECONNREFUSED') });
    await expect(gw.extrairTemplate(IMG)).rejects.toBeInstanceOf(ReconhecimentoFacialIndisponivel);
  });

  it('template malformado → Indisponivel', async () => {
    const gw = new ReconhecimentoFacialHttpGateway({ baseUrl: 'http://face:8000', fetchImpl: fetchQueResponde({ ok: true, template: { vetor: 'nao-array' } }) });
    await expect(gw.extrairTemplate(IMG)).rejects.toBeInstanceOf(ReconhecimentoFacialIndisponivel);
  });
});
