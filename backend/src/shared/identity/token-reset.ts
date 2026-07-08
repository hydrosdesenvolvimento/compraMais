import { createHash } from 'node:crypto';

/**
 * Token de redefinição de senha (UC015 / A1 — "Esqueci a senha"). O valor BRUTO (alta entropia,
 * randomBytes) é enviado ao usuário e NUNCA persistido: guardamos apenas seu SHA-256, como uma
 * credencial (mesma filosofia de senha em Usuario). Uso único e com expiração — validar antes de
 * redefinir. Não estende EntidadeBase por ser um registro efêmero (não é agregado de negócio).
 */
export interface TokenResetState {
  id: string;
  usuarioId: string;
  tokenHash: string;
  expiraEm: string; // ISO-8601
  usadoEm: string | null; // ISO-8601 quando consumido; null enquanto válido
}

/** Hash determinístico do token bruto para busca/armazenamento (SHA-256; entrada de alta entropia). */
export function hashTokenReset(bruto: string): string {
  return createHash('sha256').update(bruto).digest('hex');
}

export class TokenReset {
  private constructor(
    readonly id: string,
    readonly usuarioId: string,
    readonly tokenHash: string,
    readonly expiraEm: string,
    private _usadoEm: string | null,
  ) {}

  /** Emite um novo token: guarda o HASH do valor bruto e calcula a expiração a partir de `agora`. */
  static emitir(input: { id: string; usuarioId: string; bruto: string; ttlSeg: number; agora: string }): TokenReset {
    const expira = new Date(new Date(input.agora).getTime() + input.ttlSeg * 1000).toISOString();
    return new TokenReset(input.id, input.usuarioId, hashTokenReset(input.bruto), expira, null);
  }

  /** Reconstrução a partir da persistência (sem regra de emissão). */
  static deEstado(s: TokenResetState): TokenReset {
    return new TokenReset(s.id, s.usuarioId, s.tokenHash, s.expiraEm, s.usadoEm);
  }

  get usadoEm(): string | null { return this._usadoEm; }

  /** Válido = ainda não consumido E não expirado em relação a `agora`. */
  estaValido(agora: string): boolean {
    if (this._usadoEm !== null) return false;
    return new Date(agora).getTime() < new Date(this.expiraEm).getTime();
  }

  /** Consome o token (uso único). Após isso, `estaValido` retorna false. */
  marcarUsado(agora: string): void {
    this._usadoEm = agora;
  }

  estado(): TokenResetState {
    return { id: this.id, usuarioId: this.usuarioId, tokenHash: this.tokenHash, expiraEm: this.expiraEm, usadoEm: this._usadoEm };
  }
}
