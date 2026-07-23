import { describe, it, expect, beforeEach } from 'vitest';
import { UsuarioRepositoryMemory } from '../../src/shared/identity/usuario-repository.js';
import { GerirPerfilProprio, AvatarInvalido, AvatarMuitoGrande, UsuarioNaoEncontrado, AVATAR_MAX_BYTES } from '../../src/shared/identity/gerir-perfil.js';
import { Usuario } from '../../src/shared/identity/usuario.js';
import type { PiiCipher } from '../../src/shared/crypto/pii-cipher.js';

// RF018 — Gestão do próprio perfil (tela "Minha conta"): nome de exibição + foto (PII cifrada, AD-19).

/** Cifra reversível de teste (prefixo) — verifica que o caso de uso cifra ao gravar e decifra ao ler. */
const cipherFake: PiiCipher = {
  encrypt: (p) => `enc:${p}`,
  decrypt: (b) => b.replace(/^enc:/, ''),
};

/** Data URL de uma imagem PNG mínima válida (1x1). */
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

function usuario(id = 'u1', nome = 'Fulano de Tal'): Usuario {
  return Usuario.criarLocal({ id, email: 'a@b.com', senha: 'segredo12', nome, papel: 'titular' });
}

describe('GerirPerfilProprio', () => {
  let usuarios: UsuarioRepositoryMemory; let perfil: GerirPerfilProprio;
  beforeEach(async () => {
    usuarios = new UsuarioRepositoryMemory();
    perfil = new GerirPerfilProprio(usuarios, cipherFake);
    await usuarios.salvar(usuario());
  });

  it('lê o perfil (nome + e-mail + avatar null quando não há foto)', async () => {
    const p = await perfil.obter('u1');
    expect(p).toMatchObject({ userId: 'u1', email: 'a@b.com', nome: 'Fulano de Tal', avatar: null });
  });

  it('edita o nome de exibição', async () => {
    const p = await perfil.atualizar('u1', { nome: 'Novo Nome' });
    expect(p.nome).toBe('Novo Nome');
    expect((await usuarios.porId('u1'))?.nome).toBe('Novo Nome');
  });

  it('ignora nome vazio (não apaga o nome existente)', async () => {
    const p = await perfil.atualizar('u1', { nome: '   ' });
    expect(p.nome).toBe('Fulano de Tal');
  });

  it('define a foto cifrada e a devolve decifrada na leitura', async () => {
    const p = await perfil.atualizar('u1', { avatar: PNG_1PX });
    expect(p.avatar).toBe(PNG_1PX); // devolve decifrada
    const armazenado = (await usuarios.porId('u1'))?.avatar;
    expect(armazenado).toBe(`enc:${PNG_1PX}`); // persistida CIFRADA (AD-19)
    expect((await perfil.obter('u1')).avatar).toBe(PNG_1PX);
  });

  it('remove a foto quando avatar = null', async () => {
    await perfil.atualizar('u1', { avatar: PNG_1PX });
    const p = await perfil.atualizar('u1', { avatar: null });
    expect(p.avatar).toBeNull();
    expect((await usuarios.porId('u1'))?.avatar).toBeNull();
  });

  it('mantém a foto quando avatar é omitido (edita só o nome)', async () => {
    await perfil.atualizar('u1', { avatar: PNG_1PX });
    const p = await perfil.atualizar('u1', { nome: 'Só o Nome' });
    expect(p.nome).toBe('Só o Nome');
    expect(p.avatar).toBe(PNG_1PX);
  });

  it('rejeita data URL que não é imagem suportada', async () => {
    await expect(perfil.atualizar('u1', { avatar: 'data:text/plain;base64,aGVsbG8=' })).rejects.toBeInstanceOf(AvatarInvalido);
    await expect(perfil.atualizar('u1', { avatar: 'nao-e-data-url' })).rejects.toBeInstanceOf(AvatarInvalido);
  });

  it('rejeita foto acima do limite de tamanho', async () => {
    // base64 de bytes suficientes para ultrapassar o limite decodificado.
    const grande = `data:image/png;base64,${'A'.repeat(Math.ceil((AVATAR_MAX_BYTES + 10) * 4 / 3))}`;
    await expect(perfil.atualizar('u1', { avatar: grande })).rejects.toBeInstanceOf(AvatarMuitoGrande);
  });

  it('falha quando o usuário do token não existe', async () => {
    await expect(perfil.obter('fantasma')).rejects.toBeInstanceOf(UsuarioNaoEncontrado);
    await expect(perfil.atualizar('fantasma', { nome: 'x' })).rejects.toBeInstanceOf(UsuarioNaoEncontrado);
  });
});
