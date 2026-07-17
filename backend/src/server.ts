import Fastify, { type FastifyInstance } from 'fastify';
import { registrarSegurancaHttp } from './shared/http/security.js';
import { registrarAutenticacao } from './shared/http/autenticacao.js';
import { registrarDocsApi } from './shared/http/openapi.js';
import { InMemoryEventBus } from './shared/events/event-bus.js';
import { AuditConsumer } from './auditoria/application/audit-consumer.js';
import { AuditRepositoryMemory } from './auditoria/adapters/audit-repository-memory.js';
import { AuditRepositoryPg } from './auditoria/adapters/audit-repository-pg.js';
import type { AuditRepository } from './auditoria/infra/audit-repository.js';
import { ReceitaMockGateway } from './shared/acl/receita/receita-mock.js';
import { ReceitaBrasilApiGateway } from './shared/acl/receita/receita-brasilapi.js';
import { CepBrasilApiGateway } from './shared/acl/cep/cep-brasilapi.js';
import { CepMockGateway } from './shared/acl/cep/cep-mock.js';
import { CadastrarFornecedor } from './catalogo/application/cadastrar-fornecedor.js';
import { GerirConta } from './catalogo/application/gerir-conta.js';
import { FornecedorRepositoryMemory } from './catalogo/adapters/fornecedor-repository-memory.js';
import { FornecedorRepositoryPg } from './catalogo/adapters/fornecedor-repository-pg.js';
import type { FornecedorRepository } from './catalogo/application/fornecedor-repository.js';
import { registrarRotasCadastro } from './catalogo/adapters/cadastro-controller.js';
import { ContaRepositoryMemory, type ContaRepository } from './shared/identity/conta-repository.js';
import { ContaRepositoryPg } from './shared/identity/conta-repository-pg.js';
import { GerirProcuradores } from './shared/identity/gerir-procuradores.js';
import { registrarRotasIdentidade } from './shared/identity/identity-controller.js';
import { loadConfig, temPostgresConfigurado } from './shared/config/env.js';
import { criarPool } from './shared/db/pool.js';
import { aplicarMigracoes } from './shared/db/migracoes.js';
import type { Pool } from 'pg';
import { UsuarioRepositoryMemory, type UsuarioRepository } from './shared/identity/usuario-repository.js';
import { UsuarioRepositoryPg } from './shared/identity/usuario-repository-pg.js';
import { JwtTokenService } from './shared/identity/token-service.js';
import { RegistrarUsuario, AutenticarLocal, VincularGoogle, AutenticarGoogle } from './shared/identity/autenticacao.js';
import { GerirUsuariosInternos } from './shared/identity/gerir-usuarios-internos.js';
import { registrarRotasUsuariosInternos } from './shared/identity/usuarios-internos-controller.js';
import { TrocarSenha, SolicitarResetSenha, RedefinirSenha } from './shared/identity/gerir-senha.js';
import { ResetTokenRepositoryMemory, type ResetTokenRepository } from './shared/identity/reset-token-repository.js';
import { ResetTokenRepositoryPg } from './shared/identity/reset-token-repository-pg.js';
import { NotificadorResetLog } from './shared/identity/notificador-reset.js';
import { registrarRotasAuth } from './shared/identity/auth-controller.js';
import { registrarGoogleOAuth } from './shared/http/google-oauth.js';
import { EditalRepositoryMemory } from './editais/adapters/edital-repository-memory.js';
import { EditalRepositoryPg } from './editais/adapters/edital-repository-pg.js';
import { NumeradorEditaisPg } from './editais/adapters/numerador-editais-pg.js';
import { NumeradorEditaisMemory } from './editais/adapters/numerador-editais-memory.js';
import type { NumeradorEditais } from './editais/application/numerador-editais.js';
import { ListarEditaisCompativeis, type EditalRepository } from './editais/application/listar-editais-compativeis.js';
import { registrarRotasEditais } from './editais/adapters/editais-controller.js';
import { GerirEditais } from './editais/application/gerir-editais.js';
import { BuscarEditais } from './editais/application/buscar-editais.js';
import { ContestarCnae, ResolverContestacao, type ContestacaoRepository } from './editais/application/contestar-cnae.js';
import { ContestacaoRepositoryMemory } from './editais/adapters/contestacao-repository-memory.js';
import { ContestacaoRepositoryPg } from './editais/adapters/contestacao-repository-pg.js';
import { registrarRotasGestaoEditais } from './editais/adapters/editais-gestao-controller.js';
import { registrarRotasContestacao } from './editais/adapters/contestacao-controller.js';
import { GerirDocumentos } from './credenciamento/application/gerir-documentos.js';
import { DocumentoRepositoryMemory, ObjectStorageMemory } from './credenciamento/adapters/documentos-memory.js';
import { DocumentoRepositoryPg, ObjectStoragePg } from './credenciamento/adapters/documentos-pg.js';
import { PiiCipherAesGcm } from './shared/crypto/pii-cipher-aes.js';
import { ConsentimentoRepositoryMemory } from './credenciamento/adapters/consentimento-repository-memory.js';
import { ConsentimentoRepositoryPg } from './credenciamento/adapters/consentimento-repository-pg.js';
import { registrarRotasDocumentos } from './credenciamento/adapters/documentos-controller.js';
import { Covalidar } from './credenciamento/application/covalidar.js';
import { AnaliseRepositoryMemory } from './credenciamento/adapters/analise-repository-memory.js';
import { registrarRotasCovalidacao } from './credenciamento/adapters/covalidacao-controller.js';
import { VerificarElegibilidade, type BloqueioRepository } from './credenciamento/application/verificar-elegibilidade.js';
import { BloqueioRepositoryMemory } from './credenciamento/adapters/bloqueio-repository-memory.js';
import { BloqueioRepositoryPg } from './credenciamento/adapters/bloqueio-repository-pg.js';
import { DividaMockGateway } from './shared/acl/divida/divida-mock.js';
import { registrarRotasElegibilidade } from './credenciamento/adapters/elegibilidade-controller.js';
import { registrarRotasRegularizacao } from './credenciamento/adapters/regularizacao-controller.js';
import { SolicitarCredenciamento, type CredenciamentoRepository } from './credenciamento/application/solicitar-credenciamento.js';
import { ListarCredenciamentos, type SecretariaLookup } from './credenciamento/application/listar-credenciamentos.js';
import { CredenciamentoRepositoryMemory } from './credenciamento/adapters/credenciamento-repository-memory.js';
import { CredenciamentoRepositoryPg } from './credenciamento/adapters/credenciamento-repository-pg.js';
import { registrarRotasCredenciamento } from './credenciamento/adapters/credenciamento-controller.js';
import { InMemoryAdapterMetrics } from './shared/observability/metrics.js';
import { ConsultarTrilha } from './auditoria/application/consultar-trilha.js';
import { ExportarTrilha } from './auditoria/application/exportar-trilha.js';
import { registrarRotasAuditoria } from './auditoria/adapters/auditoria-controller.js';
import { GerarMalote, type MaloteRepository } from './malote/application/gerar-malote.js';
import { MaloteRepositoryMemory } from './malote/adapters/malote-repository-memory.js';
import { MaloteRepositoryPg } from './malote/adapters/malote-repository-pg.js';
import { registrarRotasMalote } from './malote/adapters/malote-controller.js';
import { FilaMaloteMemory } from './malote/application/fila-malote.js';
import { FilaMalotePg } from './malote/adapters/fila-malote-pg.js';
import { GerirDireitosTitular, type SolicitacaoRepository } from './titular/application/gerir-direitos.js';
import { PoliticaRetencao } from './titular/domain/solicitacao-titular.js';
import { ConsolidarPendencias } from './titular/application/consolidar-pendencias.js';
import { SolicitacaoRepositoryMemory } from './titular/adapters/solicitacao-repository-memory.js';
import { SolicitacaoRepositoryPg } from './titular/adapters/solicitacao-repository-pg.js';
import { registrarRotasTitular } from './titular/adapters/titular-controller.js';
import { DashboardAdmin, Transparencia } from './paineis/application/paineis.js';
import { registrarRotasPaineis } from './paineis/adapters/paineis-controller.js';
import { ManterCatalogos } from './catalogos/application/manter-catalogos.js';
import { CatalogoRepositoryMemory } from './catalogos/adapters/catalogo-repository-memory.js';
import { SecretariaRepositoryPg, SetorCnaeRepositoryPg, TipoDocumentoRepositoryPg } from './catalogos/adapters/catalogo-repository-pg.js';
import type { Secretaria } from './catalogos/domain/secretaria.js';
import type { SetorCnae } from './catalogos/domain/setor-cnae.js';
import type { TipoDocumento } from './catalogos/domain/tipo-documento.js';
import type { CatalogoRepository } from './catalogos/application/catalogo-repository.js';
import { registrarRotasCatalogos } from './catalogos/adapters/catalogos-controller.js';
import { GerirVisibilidadeTelas } from './permissoes/application/gerir-visibilidade.js';
import { VisibilidadeRepositoryMemory } from './permissoes/adapters/visibilidade-repository-memory.js';
import { VisibilidadeRepositoryPg } from './permissoes/adapters/visibilidade-repository-pg.js';
import type { VisibilidadeRepository } from './permissoes/application/visibilidade-repository.js';
import { registrarRotasPermissoes } from './permissoes/adapters/permissoes-controller.js';

/**
 * Bootstrap (camada de INFRA) + composition root. O Fastify é detalhe plugável: o domínio e os
 * casos de uso não o conhecem (Clean Architecture / AD-32). Aqui ligamos as dependências.
 * MVP usa adaptadores em memória; os adaptadores pg/S3 implementam as mesmas portas.
 */
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  // Hardening transversal (helmet + CORS) antes das rotas — AD-19/AD-29.
  registrarSegurancaHttp(app);
  // Documentação OpenAPI/Swagger UI em /docs — AGUARDADA antes das rotas para que o hook
  // onRoute do swagger capture todas as rotas registradas a seguir.
  await registrarDocsApi(app);
  app.get('/health', async () => ({ status: 'ok', service: 'compra-mais-backend' }));

  // Persistência: cria o pool e aplica as migrações (todas, em ordem) quando há Postgres (fora de teste).
  const config = loadConfig();
  let pool: Pool | undefined;
  if (config.nodeEnv !== 'test' && temPostgresConfigurado()) {
    pool = criarPool(config.database);
    const novas = await aplicarMigracoes(pool, (m) => app.log.info(m));
    app.log.info({ migracoesNovas: novas.length }, 'migrations verified');
    app.addHook('onClose', async () => { await pool!.end(); });
  }

  // Identidade (AD-20): resolve o Bearer token em `req.identidade` para TODAS as rotas de negócio.
  // Precisa vir antes do primeiro `app.get/post` — o Fastify só aplica um hook às rotas registradas
  // depois dele. É a única origem de identidade/papel; os headers `x-papel`/`x-user-id` não autorizam.
  const tokens = new JwtTokenService(config.auth.jwtSecret, config.auth.jwtExpiraEmSeg);
  registrarAutenticacao(app, tokens);

  // Barramento + auditoria (escritor único — AD-18). Trilha durável em Postgres quando disponível;
  // a leitura (004) usa o MESMO repositório do escritor.
  const bus = new InMemoryEventBus();
  const auditRepo: AuditRepository = pool ? new AuditRepositoryPg(pool) : new AuditRepositoryMemory();
  new AuditConsumer(bus, auditRepo).register([
    'FornecedorCadastrado', 'FornecedorSincronizado', 'PerfilEditado',
    'ProcuradorConvidado', 'ProcuradorRemovido',
    'DocumentoAprovado', 'DocumentoReprovado', 'FornecedorCredenciado', 'FornecedorEmCorrecao',
    'CredenciamentoIniciado', 'TermoAceito', 'CredenciamentoCancelado',
    'InadimplenciaVerificada', 'BloqueioAplicado', 'BloqueioLiberado',
    'EditalCriado', 'EditalPublicado', 'EditalEncerrado', 'EditalEditado',
    'PublicoAlvoAmpliado', 'ContestacaoCnaeAberta', 'ContestacaoCnaeAcatada', 'ContestacaoCnaeRecusada',
    'MaloteGerado', 'MaloteExportado',
    'DireitoTitularSolicitado', 'DireitoTitularAtendido',
    'UsuarioRegistrado', 'UsuarioAutenticado', 'GoogleVinculado',
    'SenhaAlterada', 'ResetSenhaSolicitado', 'SenhaRedefinida',
    'CatalogoItemCriado', 'CatalogoItemEditado', 'CatalogoItemInativado', 'CatalogoItemReativado',
    'UsuarioInternoCriado', 'UsuarioInternoEditado', 'UsuarioSenhaResetada', 'UsuarioInternoInativado', 'UsuarioInternoReativado',
    'VisibilidadeTelasAlterada',
  ]);

  // Identidade (US1): contas + procuradores. Persistência durável em Postgres quando disponível (como
  // `usuarios`/`fornecedores`); senão memória (testes sem banco). Antes era sempre memória → os vínculos
  // de procurador (UC019) não sobreviviam a restart.
  const contasRepo: ContaRepository = pool ? new ContaRepositoryPg(pool) : new ContaRepositoryMemory();

  // Autenticação (FR-015 / AD-20): registro/login local com JWT + vínculo/login Google.
  // Reaproveita o mesmo pool: Postgres quando configurado; senão memória (testes sem banco).
  const usuarioRepo: UsuarioRepository = pool ? new UsuarioRepositoryPg(pool) : new UsuarioRepositoryMemory();

  // Procuradores (UC019): resolve o titular pela ContaAcesso; se ausente (conta criada antes desta UC),
  // provisiona sob demanda a partir do titular de login em `usuarios` (backfill idempotente).
  const procuradores = new GerirProcuradores(contasRepo, bus, {
    titularDeLogin: async (fornecedorId, userId) => {
      const u = await usuarioRepo.porId(userId);
      return u && u.papel === 'titular' && u.fornecedorId === fornecedorId ? { identificador: u.email } : null;
    },
  });
  registrarRotasIdentidade(app, { procuradores });

  // Reutilizado pelo cadastro de fornecedor (UC001): o cadastro cria a credencial de login (e-mail/senha).
  const registrarUsuario = new RegistrarUsuario(usuarioRepo, bus);
  // UC015 — gestão da própria senha (RF015): reset de senha (A1) com token durável + notificador plugável.
  // MVP sem gateway de e-mail (LAC-07): o link é registrado no log (NotificadorResetLog); o token some do
  // servidor (só o hash é persistido). O link aponta para a rota do frontend #/redefinir-senha.
  const resetTokens: ResetTokenRepository = pool ? new ResetTokenRepositoryPg(pool) : new ResetTokenRepositoryMemory();
  const resetLinkBase = process.env.RESET_LINK_BASE ?? '/#/redefinir-senha';
  const notificadorReset = new NotificadorResetLog(resetLinkBase, (m) => app.log.info(m));
  registrarRotasAuth(app, {
    registrar: registrarUsuario,
    login: new AutenticarLocal(usuarioRepo, tokens, bus),
    vincularGoogle: new VincularGoogle(usuarioRepo, bus),
    trocarSenha: new TrocarSenha(usuarioRepo, bus),
    solicitarReset: new SolicitarResetSenha(usuarioRepo, resetTokens, notificadorReset, bus, config.auth.jwtExpiraEmSeg),
    redefinirSenha: new RedefinirSenha(usuarioRepo, resetTokens, bus),
    tokens,
  });
  if (config.auth.google) {
    registrarGoogleOAuth(app, config.auth.google, {
      autenticarGoogle: new AutenticarGoogle(usuarioRepo, tokens, bus),
      frontendRedirect: config.auth.frontendRedirect,
    });
  }

  // UC021 — Gestão de usuários internos/servidores (RF023, §15/AD-35). CRUD administrativo sobre a
  // MESMA identidade de login (`usuarioRepo`): cargo→papel RBAC, reset de senha e inativação lógica
  // (RN015). Durável junto com `usuarios` (Postgres quando disponível). Só o Administrador opera.
  registrarRotasUsuariosInternos(app, { gerir: new GerirUsuariosInternos(usuarioRepo, bus) });

  // Módulo catálogo (US1). CNPJ/CEP via BrasilAPI em runtime; mock em teste ou RECEITA_PROVIDER=mock
  // (sem rede). Os gateways degradam para 'indisponivel' em falha/timeout (fallback manual visível).
  // Persistência do fornecedor: Postgres quando disponível (durável, como `usuarios`); senão memória
  // (testes sem banco). Antes era sempre memória → o login sobrevivia ao restart mas o fornecedor não.
  const fornecedores: FornecedorRepository = pool ? new FornecedorRepositoryPg(pool) : new FornecedorRepositoryMemory();
  const usarMockReceita = config.nodeEnv === 'test' || process.env.RECEITA_PROVIDER === 'mock';
  const receita = usarMockReceita ? new ReceitaMockGateway() : new ReceitaBrasilApiGateway();
  const cep = usarMockReceita ? new CepMockGateway() : new CepBrasilApiGateway();
  // Consentimento LGPD (AD-19 / RN016): era `{ salvar: async () => {} }` — o consentimento do titular
  // era construído e jogado fora. A LGPD exige DEMONSTRAR o consentimento; a prova nunca existiu.
  // A tabela recusa UPDATE/DELETE (0017): consentimento não se edita, se revoga com um fato novo.
  const consentimentosRepo = pool ? new ConsentimentoRepositoryPg(pool) : new ConsentimentoRepositoryMemory();
  const cadastrar = new CadastrarFornecedor(fornecedores, consentimentosRepo, contasRepo, receita, registrarUsuario, bus);
  const conta = new GerirConta(fornecedores, receita, bus);
  registrarRotasCadastro(app, { cadastrar, conta, receita, cep });

  // Catálogos base (UC020 / RF020-RF022): Secretarias + Setores/CNAE + Tipos de Documento. CRUD com
  // inativação lógica (RN015), mantido pelo Administrador. Durável em Postgres quando disponível (como
  // `editais`/`fornecedores`); senão memória (testes sem banco). Alimenta editais (secretaria/CNAE) e
  // o upload/covalidação (tipos de documento). Declarado ANTES de editais/credenciamento porque a
  // projeção de "Meus Credenciamentos" resolve a sigla da secretaria por aqui.
  const secretariasRepo: CatalogoRepository<Secretaria> = pool ? new SecretariaRepositoryPg(pool) : new CatalogoRepositoryMemory<Secretaria>();
  const setoresRepo: CatalogoRepository<SetorCnae> = pool ? new SetorCnaeRepositoryPg(pool) : new CatalogoRepositoryMemory<SetorCnae>();
  const tiposDocRepo: CatalogoRepository<TipoDocumento> = pool ? new TipoDocumentoRepositoryPg(pool) : new CatalogoRepositoryMemory<TipoDocumento>();
  const manterCatalogos = new ManterCatalogos({ secretarias: secretariasRepo, setores: setoresRepo, tiposDocumento: tiposDocRepo }, bus);
  registrarRotasCatalogos(app, { manter: manterCatalogos });

  // Módulo editais — vitrine filtrada por CNAE (002) + gestão/contestação de editais (003)
  // Persistência: Postgres quando disponível (durável, como `fornecedores`/`contas_acesso`); senão
  // memória (testes sem banco). Antes era sempre memória → editais criados/publicados se perdiam no restart.
  const editaisRepo: EditalRepository = pool ? new EditalRepositoryPg(pool) : new EditalRepositoryMemory();
  const vitrine = new ListarEditaisCompativeis(editaisRepo, fornecedores);
  registrarRotasEditais(app, { vitrine });

  // Editais individualizados (003): criação/publicação/edição/encerramento + busca QBE + contestação de CNAE
  const contestacaoRepo: ContestacaoRepository = pool ? new ContestacaoRepositoryPg(pool) : new ContestacaoRepositoryMemory();
  // Numeração oficial ED-AAAA/NNN: durável e atômica em Postgres (tabela `edital_numeros`); em memória
  // nos testes/sem banco. Sem ela dois editais do mesmo ano poderiam receber o mesmo número.
  const numeradorEditais: NumeradorEditais = pool ? new NumeradorEditaisPg(pool) : new NumeradorEditaisMemory();
  const gerirEditais = new GerirEditais(editaisRepo, bus, undefined, contestacaoRepo, undefined, numeradorEditais);
  const buscarEditais = new BuscarEditais(editaisRepo);
  registrarRotasGestaoEditais(app, { gerir: gerirEditais, buscar: buscarEditais });
  const fornecedorAtivo = { estaAtivo: async (id: string) => { const f = await fornecedores.porId(id); return !!f && f.situacao === 'ativa'; } };
  const contestar = new ContestarCnae(editaisRepo, contestacaoRepo, fornecedorAtivo, bus);
  const resolver = new ResolverContestacao(contestacaoRepo, gerirEditais, bus);
  registrarRotasContestacao(app, { contestar, resolver, contestacoes: contestacaoRepo });

  // Módulo credenciamento — documentos (001 US3) + covalidação (UC006 / 002 US1), repo compartilhado.
  // A covalidação recebe o repo de fornecedores (`fornecedores`, def. acima) para o veredito do conjunto:
  // aprovar o conjunto → `credenciado` (UC006 passo 3); reprovar → `em_correcao` (A1, laço UC016).
  // Documentos + PII (AD-19). Antes: `DocumentoRepositoryMemory` + `ObjectStorageMemory` +
  // `PiiCipherDev` INCONDICIONAIS — mesmo com Postgres, os documentos comprobatórios e a PII de
  // sócios viviam num Map e sumiam no restart, levando junto a fila de covalidação (UC006). Era o
  // único agregado sem par pg. A cifra é AES-256-GCM sempre (a chave é que muda por ambiente; em
  // produção `loadConfig` exige a real): base64 nunca foi cifra, e manter dois ciphers criaria blob
  // legado indecifrável assim que o conteúdo virasse durável.
  const docRepo = pool ? new DocumentoRepositoryPg(pool) : new DocumentoRepositoryMemory();
  const storage = pool ? new ObjectStoragePg(pool) : new ObjectStorageMemory();
  const docs = new GerirDocumentos(docRepo, storage, new PiiCipherAesGcm(config.crypto.piiKey));
  registrarRotasDocumentos(app, { docs });
  const covalidar = new Covalidar(docRepo, new AnaliseRepositoryMemory(), bus, fornecedores);
  registrarRotasCovalidacao(app, { covalidar });

  // Credenciamento — solicitação + Termo de Aceite (UC004 / RN005/RN016). Persistência durável em
  // Postgres quando disponível (como `editais`/`fornecedores`); senão memória (testes sem banco).
  // Precondição de edital Aberto + compatível reusa a vitrine (UC003); o aceite move o fornecedor a
  // `pendente_analise`; o cancelamento (A2) é permitido antes da distribuição.
  const credRepo: CredenciamentoRepository = pool ? new CredenciamentoRepositoryPg(pool) : new CredenciamentoRepositoryMemory();
  const solicitarCredenciamento = new SolicitarCredenciamento(credRepo, vitrine, fornecedores, bus);
  // Leitura da home do fornecedor: lista seus credenciamentos enriquecidos com objeto/secretaria do
  // edital (reusa o `editaisRepo` já definido acima). Somente leitura — não altera o domínio.
  // Sigla da secretaria (ex.: SEME) para a tela "Meus Credenciamentos". Editais guardam `secretariaId`
  // livre (sem FK para o catálogo UC020) — sem match a projeção cai para o próprio id, nunca quebra.
  const secretariaLookup: SecretariaLookup = {
    siglaPorId: async (id) => (await secretariasRepo.porId(id))?.sigla ?? null,
  };
  const listarCredenciamentos = new ListarCredenciamentos(credRepo, editaisRepo, secretariaLookup);
  registrarRotasCredenciamento(app, { solicitar: solicitarCredenciamento, listar: listarCredenciamentos });

  // Credenciamento — elegibilidade fiscal / bloqueio transitório (002 US2): fail-open+flag (AD-11/12)
  const metrics = new InMemoryAdapterMetrics();
  app.get('/metrics/adapters', async () => metrics.snapshot());
  const divida = new DividaMockGateway(new Map(), metrics);
  // Durável em Postgres (bloqueio transitório sobrevive a restart p/ reavaliação por porta); memória em teste.
  const bloqueios: BloqueioRepository = pool ? new BloqueioRepositoryPg(pool) : new BloqueioRepositoryMemory();
  // Política de indisponibilidade configurável por ambiente (AD-12): default fail-open + flag CPL.
  const politicaInadimplencia = process.env.INADIMPLENCIA_POLICY === 'fail-closed' ? 'fail-closed' : 'fail-open';
  const elegibilidade = new VerificarElegibilidade(divida, bloqueios, bus, politicaInadimplencia);
  registrarRotasElegibilidade(app, { elegibilidade });

  // Credenciamento — regularização/contestação (002 US3): ponto único de pendências
  registrarRotasRegularizacao(app, { docs: docRepo, bloqueios, elegibilidade });

  // Auditoria — leitura/exportação da trilha (004). SOMENTE LEITURA: lê o mesmo auditRepo do escritor único.
  const consultarTrilha = new ConsultarTrilha(auditRepo);
  // Teto de sinalização de volume da exportação (§16 — AUDITORIA_EXPORT_TETO); default 50k quando ausente/ inválido.
  const tetoExport = Number(process.env.AUDITORIA_EXPORT_TETO) || undefined;
  const exportarTrilha = new ExportarTrilha(consultarTrilha, tetoExport);
  registrarRotasAuditoria(app, { consultar: consultarTrilha, exportar: exportarTrilha });

  // Malote SEI (005 / Épico 6): geração assíncrona DURÁVEL (fila + retry, FR-002) + fragmentação + export idempotente.
  // Persistência durável em Postgres quando disponível (agregado + fila em tabela); senão memória (testes sem banco).
  // Antes era SEMPRE memória → malote e jobs enfileirados se perdiam no restart (perda silenciosa das Stories 6.1/6.2).
  let gerarMalote: GerarMalote;
  const maloteRepo: MaloteRepository = pool ? new MaloteRepositoryPg(pool) : new MaloteRepositoryMemory();
  const filaMalote = pool
    ? new FilaMalotePg(pool, (job) => gerarMalote.processarJob(job))
    : new FilaMaloteMemory((job) => gerarMalote.processarJob(job));
  gerarMalote = new GerarMalote(maloteRepo, bus, filaMalote); // limite global SEI_MALOTE_LIMITE_MB
  registrarRotasMalote(app, { gerar: gerarMalote });
  // Recuperação no boot: reprocessa jobs pendentes/órfãos que sobreviveram a um restart (durabilidade FR-002).
  if (filaMalote instanceof FilaMalotePg) await filaMalote.recuperar();

  // Tela única + Direitos do titular LGPD (UC017 / Épico 7). Persistência durável em Postgres quando
  // disponível (como `editais`/`bloqueios`); senão memória (testes sem banco). Antes era SEMPRE memória
  // → o pedido de direito protocolado pelo titular se perdia no restart, esvaziando a fila do DPO.
  const solicitacoesRepo: SolicitacaoRepository = pool ? new SolicitacaoRepositoryPg(pool) : new SolicitacaoRepositoryMemory();
  // Prazos de retenção por categoria externalizados (AD-36 / RNF007 — NIV-06): política pública
  // configurável por ambiente (RETENCAO_*_DIAS), não mais hardcoded no construtor do caso de uso.
  const politicaRetencao = new PoliticaRetencao(
    { cadastral: config.retencaoDias.cadastral, fiscal: config.retencaoDias.fiscal, contratual: config.retencaoDias.contratual },
    config.retencaoDias.padrao,
  );
  const direitosTitular = new GerirDireitosTitular(solicitacoesRepo, bus, politicaRetencao);
  const consolidar = new ConsolidarPendencias({
    documentosReprovados: async (id) => (await docRepo.listar(id)).filter((d) => d.status === 'reprovado').map((d) => ({ id: d.id, motivo: d.motivoReprovacao })),
    bloqueiosAtivos: async (id) => (await bloqueios.ativosDe(id)).map((b) => ({ id: b.id, motivo: b.motivo })),
    contestacoesCnaePendentes: async (id) => (await contestacaoRepo.pendentesDoFornecedor(id)).map((c) => ({ id: c.id, cnae: c.cnaeContestado })),
    solicitacoesLgpdPendentes: async (id) => (await solicitacoesRepo.buscarPorExemplo({ titularId: id, status: 'pendente' })).map((s) => ({ id: s.id, tipo: s.tipo })),
  });
  registrarRotasTitular(app, { direitos: direitosTitular, pendencias: consolidar });

  // Painéis (007 / Épico 9): dashboard admin (funil) + transparência pública. Somente leitura (projeções).
  const paineisFonte = {
    contarDocumentosPendentes: async () => (await docRepo.buscarPorExemplo({ status: 'pendente' as const })).length,
    contarEditaisPorSituacao: async () => ({
      rascunho: (await editaisRepo.buscarPorExemplo({ situacao: 'rascunho' })).length,
      publicado: (await editaisRepo.buscarPorExemplo({ situacao: 'publicado' })).length,
      encerrado: (await editaisRepo.buscarPorExemplo({ situacao: 'encerrado' })).length,
    }),
    contarBloqueiosAtivos: async () => bloqueios.contarAtivos(),
    editaisPublicados: async () => (await editaisRepo.buscarPorExemplo({ situacao: 'publicado' })).map((e) => ({ secretariaId: e.secretariaId, cnaesAlvo: e.cnaesAlvo })),
  };
  registrarRotasPaineis(app, { dashboard: new DashboardAdmin(paineisFonte), transparencia: new Transparencia(paineisFonte) });

  // Administração de telas por perfil (§15/AD-35): governa quais TELAS do Painel Admin cada papel enxerga.
  // O Administrador é superusuário (vê tudo); os demais papéis internos seguem o override persistido ou o
  // padrão dos UCs. Durável em Postgres quando disponível (a política sobrevive a restart e é compartilhada
  // entre servidores); senão memória (testes sem banco). Alimenta o menu e as guardas de rota do frontend.
  const visibilidadeRepo: VisibilidadeRepository = pool ? new VisibilidadeRepositoryPg(pool) : new VisibilidadeRepositoryMemory();
  const gerirVisibilidade = new GerirVisibilidadeTelas(visibilidadeRepo, bus);
  registrarRotasPermissoes(app, { gerir: gerirVisibilidade });

  // Observabilidade base (AD-22): instrumentar timeouts/circuit-breaker dos adaptadores — pendente.
  return app;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 3000);
  app.listen({ port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
