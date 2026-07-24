/**
 * Porta de entrega do link de redefinição de senha (UC015 / A1). O MVP não tem gateway de e-mail/SMS
 * (LAC-07, ver UC013) — o adaptador padrão apenas registra o link no log do servidor, mantendo o fluxo
 * completo e auditável sem acoplar um provedor externo. Trocar por um adaptador real (e-mail/SMS) não
 * exige mudança nos casos de uso. O caso de uso passa o token BRUTO; o adaptador monta o link.
 */
export interface NotificadorReset {
  enviar(input: { email: string; token: string }): Promise<void>;
}

/** Adaptador de log (dev/MVP): não expõe o token em resposta HTTP; só o registra no log do servidor. */
export class NotificadorResetLog implements NotificadorReset {
  constructor(private readonly linkBase: string, private readonly log: (m: string) => void) {}
  async enviar({ email, token }: { email: string; token: string }): Promise<void> {
    const sep = this.linkBase.includes('?') ? '&' : '?';
    this.log(`[reset-senha] link de redefinição para ${email}: ${this.linkBase}${sep}token=${token}`);
  }
}
