import { randomUUID } from 'node:crypto';
import { Usuario, normalizarEmail } from './usuario.js';
import type { UsuarioRepository } from './usuario-repository.js';
import { ehPapelInterno } from './identity-provider.js';
import { papelDoCargo } from './cargos-internos.js';
import { EmailJaCadastrado, UsuarioNaoEncontrado } from './autenticacao.js';
import type { EventBus } from '../events/event-bus.js';
import {
  UsuarioInternoCriado, UsuarioInternoEditado, UsuarioSenhaResetada,
  UsuarioInternoInativado, UsuarioInternoReativado,
} from './eventos.js';

/** O alvo existe mas não é um servidor interno (ex.: é um titular/procurador do autocadastro). */
export class NaoEUsuarioInterno extends Error { constructor() { super('User is not an internal server account.'); this.name = 'NaoEUsuarioInterno'; } }
/** Guard anti-lockout: o Administrador não pode inativar a própria conta. */
export class NaoPodeInativarPropriaConta extends Error { constructor() { super('You cannot deactivate your own account.'); this.name = 'NaoPodeInativarPropriaConta'; } }

type Actor = { userId: string };

/** Projeção de leitura de um servidor interno (sem segredos — nunca expõe hash/salt). */
export interface UsuarioInternoView {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  papel: string;
  ativo: boolean;
  registerDate: string;
  updateDate: string;
}

function paraView(u: Usuario): UsuarioInternoView {
  return {
    id: u.id, nome: u.nome, email: u.email, cargo: u.cargo, papel: u.papel, ativo: u.ativo,
    registerDate: u.registerDate, updateDate: u.updateDate,
  };
}

const agora = (): string => new Date().toISOString();

/**
 * UC021 — Gerir Usuários Internos (Servidores). CRUD administrativo das contas de servidor da
 * Prefeitura sobre a MESMA entidade de login (`Usuario`), com o cargo (RF023) mapeado num papel RBAC
 * (§15/AD-35): as permissões seguem o papel. Distinto do autocadastro do fornecedor (UC001/UC015) —
 * este fluxo só cria/gere contas de papel interno. Inativação é LÓGICA (RN015), preservando a autoria
 * histórica na trilha (AD-38). O RBAC de "só o Administrador opera" é aplicado no controller.
 */
export class GerirUsuariosInternos {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly bus: EventBus,
    private readonly now: () => string = agora,
  ) {}

  async criar(input: { nome: string; email: string; cargo: string; senha: string }, actor: Actor): Promise<{ usuarioId: string }> {
    const email = normalizarEmail(input.email);
    const papel = papelDoCargo(input.cargo); // CargoInvalido → 422
    if (await this.usuarios.porEmail(email)) throw new EmailJaCadastrado();
    const u = Usuario.criarLocal({
      id: randomUUID(), email, senha: input.senha, nome: input.nome, papel, cargo: input.cargo, userName: actor.userId,
    });
    await this.usuarios.salvar(u);
    await this.publicar(new UsuarioInternoCriado(u.id, { email: u.email, cargo: input.cargo, papel }, actor));
    return { usuarioId: u.id };
  }

  async editar(id: string, campos: { nome?: string; cargo?: string }, actor: Actor): Promise<void> {
    const u = await this.exigirInterno(id);
    if (campos.nome !== undefined) u.renomear(campos.nome, actor.userId);
    if (campos.cargo !== undefined) {
      const papel = papelDoCargo(campos.cargo); // CargoInvalido → 422
      u.definirCargoEPapel(campos.cargo, papel, actor.userId);
    }
    await this.usuarios.salvar(u);
    await this.publicar(new UsuarioInternoEditado(u.id, { cargo: u.cargo, papel: u.papel }, actor));
  }

  /** Admin redefine a senha do servidor; o usuário troca a própria depois (UC015). SenhaFraca → 422. */
  async resetarSenha(id: string, novaSenha: string, actor: Actor): Promise<void> {
    const u = await this.exigirInterno(id);
    u.definirSenha(novaSenha, actor.userId);
    await this.usuarios.salvar(u);
    await this.publicar(new UsuarioSenhaResetada(u.id, { metodo: 'admin-reset' }, actor));
  }

  async inativar(id: string, actor: Actor): Promise<void> {
    if (id === actor.userId) throw new NaoPodeInativarPropriaConta();
    const u = await this.exigirInterno(id);
    if (!u.ativo) return; // idempotente
    u.inativar(actor.userId);
    await this.usuarios.salvar(u);
    await this.publicar(new UsuarioInternoInativado(u.id, {}, actor));
  }

  async reativar(id: string, actor: Actor): Promise<void> {
    const u = await this.exigirInterno(id);
    if (u.ativo) return; // idempotente
    u.reativar(actor.userId);
    await this.usuarios.salvar(u);
    await this.publicar(new UsuarioInternoReativado(u.id, {}, actor));
  }

  async listar(filtro?: { incluirInativos?: boolean }): Promise<UsuarioInternoView[]> {
    return (await this.usuarios.listarInternos(filtro)).map(paraView);
  }

  private async exigirInterno(id: string): Promise<Usuario> {
    const u = await this.usuarios.porId(id);
    if (!u) throw new UsuarioNaoEncontrado();
    if (!ehPapelInterno(u.papel)) throw new NaoEUsuarioInterno();
    return u;
  }

  private publicar(ev: { toEnvelope(id: string, at: string): import('../events/domain-event.js').DomainEventEnvelope }): Promise<void> {
    return this.bus.publish(ev.toEnvelope(randomUUID(), this.now()));
  }
}
