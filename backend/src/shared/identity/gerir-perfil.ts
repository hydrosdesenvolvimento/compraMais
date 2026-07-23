import type { UsuarioRepository } from './usuario-repository.js';
import type { PiiCipher } from '../crypto/pii-cipher.js';

/** Usuário do token não encontrado no repositório (sessão válida, conta removida). */
export class UsuarioNaoEncontrado extends Error { constructor() { super('User not found.'); this.name = 'UsuarioNaoEncontrado'; } }
/** Avatar enviado não é um data URL de imagem suportada (png/jpeg/webp). */
export class AvatarInvalido extends Error { constructor() { super('Avatar must be a PNG, JPEG or WEBP image data URL.'); this.name = 'AvatarInvalido'; } }
/** Avatar acima do limite de tamanho (após decodificar o base64). */
export class AvatarMuitoGrande extends Error { constructor() { super('Avatar image is too large.'); this.name = 'AvatarMuitoGrande'; } }

/** Foto de perfil aceita: data URL base64 de png/jpeg/webp. */
const AVATAR_RE = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
/** Limite do arquivo DECODIFICADO (1,5 MB) — foto de perfil pequena; casa com o `bodyLimit` da rota. */
export const AVATAR_MAX_BYTES = 1_500_000;

/** Perfil do próprio usuário exibido/editado na tela "Minha conta" (dados da sessão + foto decifrada). */
export interface PerfilProprio {
  userId: string;
  email: string;
  nome: string;
  /** Data URL da foto (decifrada) ou `null` quando o usuário não tem foto. */
  avatar: string | null;
}

/**
 * RF018 — gestão do PRÓPRIO perfil pelo usuário autenticado (tela "Minha conta"): lê nome/e-mail/foto
 * e edita o nome de exibição e a foto de perfil. Distinto do UC021 (edição administrativa de servidores
 * pelo Administrador): aqui o ator é sempre o dono da conta (id vem do token, nunca do corpo).
 *
 * A foto é dado pessoal (LGPD): cifrada em repouso (PiiCipher/AES-256-GCM, AD-19) — o mesmo esquema dos
 * documentos. O caso de uso valida formato e tamanho, cifra ao gravar e decifra ao ler; o domínio
 * (`Usuario`) só transporta o blob opaco.
 */
export class GerirPerfilProprio {
  constructor(private readonly usuarios: UsuarioRepository, private readonly cipher: PiiCipher) {}

  async obter(usuarioId: string): Promise<PerfilProprio> {
    const u = await this.usuarios.porId(usuarioId);
    if (!u) throw new UsuarioNaoEncontrado();
    return { userId: u.id, email: u.email, nome: u.nome, avatar: u.avatar ? this.cipher.decrypt(u.avatar) : null };
  }

  /**
   * Atualiza nome e/ou foto. Semântica do `patch` (por chave):
   *  - `nome` ausente → mantém; string vazia é ignorada pelo domínio (não apaga o nome).
   *  - `avatar` ausente → mantém a foto atual; `null` → remove; data URL válido → substitui (cifrado).
   */
  async atualizar(usuarioId: string, patch: { nome?: string; avatar?: string | null }): Promise<PerfilProprio> {
    const u = await this.usuarios.porId(usuarioId);
    if (!u) throw new UsuarioNaoEncontrado();

    if (patch.nome !== undefined) u.renomear(patch.nome, u.email);

    if (patch.avatar === null) {
      u.definirAvatar(null, u.email);
    } else if (typeof patch.avatar === 'string') {
      u.definirAvatar(this.cipher.encrypt(validarAvatar(patch.avatar)), u.email);
    }

    await this.usuarios.salvar(u);
    return { userId: u.id, email: u.email, nome: u.nome, avatar: u.avatar ? this.cipher.decrypt(u.avatar) : null };
  }
}

/** Valida o data URL da foto (formato + tamanho decodificado) e devolve o próprio data URL para cifrar. */
function validarAvatar(dataUrl: string): string {
  const m = AVATAR_RE.exec(dataUrl.trim());
  if (!m) throw new AvatarInvalido();
  // Tamanho real do binário: cada 4 chars base64 = 3 bytes, menos o padding `=`.
  const b64 = m[2] ?? '';
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  if (bytes <= 0) throw new AvatarInvalido();
  if (bytes > AVATAR_MAX_BYTES) throw new AvatarMuitoGrande();
  return dataUrl.trim();
}
