import Fastify, { type FastifyInstance } from 'fastify';
import { registrarSegurancaHttp } from './shared/http/security.js';
import { registrarDocsApi } from './shared/http/openapi.js';
import { InMemoryEventBus } from './shared/events/event-bus.js';
import { AuditConsumer } from './auditoria/application/audit-consumer.js';
import { AuditRepositoryMemory } from './auditoria/adapters/audit-repository-memory.js';
import { AuditRepositoryPg } from './auditoria/adapters/audit-repository-pg.js';
import type { AuditRepository } from './auditoria/infra/audit-repository.js';
import { ReceitaMockGateway } from './shared/acl/receita/receita-mock.js';
import { CadastrarFornecedor } from './catalogo/application/cadastrar-fornecedor.js';
import { GerirConta } from './catalogo/application/gerir-conta.js';
import { FornecedorRepositoryMemory } from './catalogo/adapters/fornecedor-repository-memory.js';
import { registrarRotasCadastro } from './catalogo/adapters/cadastro-controller.js';
import { ContaRepositoryMemory } from './shared/identity/conta-repository.js';
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
import { registrarRotasAuth } from './shared/identity/auth-controller.js';
import { registrarGoogleOAuth } from './shared/http/google-oauth.js';
import { EditalRepositoryMemory } from './editais/adapters/edital-repository-memory.js';
import { ListarEditaisCompativeis } from './editais/application/listar-editais-compativeis.js';
import { registrarRotasEditais } from './editais/adapters/editais-controller.js';
import { GerirEditais } from './editais/application/gerir-editais.js';
import { BuscarEditais } from './editais/application/buscar-editais.js';
import { ContestarCnae, ResolverContestacao } from './editais/application/contestar-cnae.js';
import { ContestacaoRepositoryMemory } from './editais/adapters/contestacao-repository-memory.js';
import { registrarRotasGestaoEditais } from './editais/adapters/editais-gestao-controller.js';
import { registrarRotasContestacao } from './editais/adapters/contestacao-controller.js';
import { GerirDocumentos } from './credenciamento/application/gerir-documentos.js';
import { DocumentoRepositoryMemory, ObjectStorageMemory, PiiCipherDev } from './credenciamento/adapters/documentos-memory.js';
import { registrarRotasDocumentos } from './credenciamento/adapters/documentos-controller.js';
import { Covalidar } from './credenciamento/application/covalidar.js';
import { AnaliseRepositoryMemory } from './credenciamento/adapters/analise-repository-memory.js';
import { registrarRotasCovalidacao } from './credenciamento/adapters/covalidacao-controller.js';
import { VerificarElegibilidade } from './credenciamento/application/verificar-elegibilidade.js';
import { BloqueioRepositoryMemory } from './credenciamento/adapters/bloqueio-repository-memory.js';
import { DividaMockGateway } from './shared/acl/divida/divida-mock.js';
import { registrarRotasElegibilidade } from './credenciamento/adapters/elegibilidade-controller.js';
import { registrarRotasRegularizacao } from './credenciamento/adapters/regularizacao-controller.js';
import { InMemoryAdapterMetrics } from './shared/observability/metrics.js';
import { ConsultarTrilha } from './auditoria/application/consultar-trilha.js';
import { ExportarTrilha } from './auditoria/application/exportar-trilha.js';
import { registrarRotasAuditoria } from './auditoria/adapters/auditoria-controller.js';
import { GerarMalote } from './malote/application/gerar-malote.js';
import { MaloteRepositoryMemory } from './malote/adapters/malote-repository-memory.js';
import { registrarRotasMalote } from './malote/adapters/malote-controller.js';
import { FilaMaloteMemory } from './malote/application/fila-malote.js';
import { GerirDireitosTitular } from './titular/application/gerir-direitos.js';
import { ConsolidarPendencias } from './titular/application/consolidar-pendencias.js';
import { SolicitacaoRepositoryMemory } from './titular/adapters/solicitacao-repository-memory.js';
import { registrarRotasTitular } from './titular/adapters/titular-controller.js';
import { DashboardAdmin, Transparencia } from './paineis/application/paineis.js';
import { registrarRotasPaineis } from './paineis/adapters/paineis-controller.js';

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
    app.log.info({ migracoesNovas: novas.length }, 'migrações verificadas');
    app.addHook('onClose', async () => { await pool!.end(); });
  }

  // Barramento + auditoria (escritor único — AD-18). Trilha durável em Postgres quando disponível;
  // a leitura (004) usa o MESMO repositório do escritor.
  const bus = new InMemoryEventBus();
  const auditRepo: AuditRepository = pool ? new AuditRepositoryPg(pool) : new AuditRepositoryMemory();
  new AuditConsumer(bus, auditRepo).register([
    'FornecedorCadastrado', 'FornecedorSincronizado', 'PerfilEditado',
    'ProcuradorConvidado', 'ProcuradorRemovido',
    'DocumentoAprovado', 'DocumentoReprovado',
    'InadimplenciaVerificada', 'BloqueioAplicado', 'BloqueioLiberado',
    'EditalCriado', 'EditalPublicado', 'EditalEncerrado', 'EditalEditado',
    'PublicoAlvoAmpliado', 'ContestacaoCnaeAberta', 'ContestacaoCnaeAcatada', 'ContestacaoCnaeRecusada',
    'MaloteGerado', 'MaloteExportado',
    'DireitoTitularSolicitado', 'DireitoTitularAtendido',
    'UsuarioRegistrado', 'UsuarioAutenticado', 'GoogleVinculado',
  ]);

  // Identidade (US1): contas + procuradores
  const contasRepo = new ContaRepositoryMemory();
  const procuradores = new GerirProcuradores(contasRepo, bus);
  registrarRotasIdentidade(app, { procuradores });

  // Autenticação (FR-015 / AD-20): registro/login local com JWT + vínculo/login Google.
  // Reaproveita o mesmo pool: Postgres quando configurado; senão memória (testes sem banco).
  const usuarioRepo: UsuarioRepository = pool ? new UsuarioRepositoryPg(pool) : new UsuarioRepositoryMemory();
  const tokens = new JwtTokenService(config.auth.jwtSecret, config.auth.jwtExpiraEmSeg);
  registrarRotasAuth(app, {
    registrar: new RegistrarUsuario(usuarioRepo, bus),
    login: new AutenticarLocal(usuarioRepo, tokens, bus),
    vincularGoogle: new VincularGoogle(usuarioRepo, bus),
    tokens,
  });
  if (config.auth.google) {
    registrarGoogleOAuth(app, config.auth.google, {
      autenticarGoogle: new AutenticarGoogle(usuarioRepo, tokens, bus),
      frontendRedirect: config.auth.frontendRedirect,
    });
  }

  // Módulo catálogo (US1)
  const fornecedores = new FornecedorRepositoryMemory();
  const receita = new ReceitaMockGateway();
  const consentimentosRepo = { salvar: async () => {} };
  const cadastrar = new CadastrarFornecedor(fornecedores, consentimentosRepo, contasRepo, receita, bus);
  const conta = new GerirConta(fornecedores, receita, bus);
  registrarRotasCadastro(app, { cadastrar, conta, receita });

  // Módulo editais — vitrine filtrada por CNAE (002) + gestão/contestação de editais (003)
  const editaisRepo = new EditalRepositoryMemory();
  const vitrine = new ListarEditaisCompativeis(editaisRepo, fornecedores);
  registrarRotasEditais(app, { vitrine });

  // Editais individualizados (003): criação/publicação/edição/encerramento + busca QBE + contestação de CNAE
  const contestacaoRepo = new ContestacaoRepositoryMemory();
  const gerirEditais = new GerirEditais(editaisRepo, bus, undefined, contestacaoRepo);
  const buscarEditais = new BuscarEditais(editaisRepo);
  registrarRotasGestaoEditais(app, { gerir: gerirEditais, buscar: buscarEditais });
  const fornecedorAtivo = { estaAtivo: async (id: string) => { const f = await fornecedores.porId(id); return !!f && f.situacao === 'ativa'; } };
  const contestar = new ContestarCnae(editaisRepo, contestacaoRepo, fornecedorAtivo, bus);
  const resolver = new ResolverContestacao(contestacaoRepo, gerirEditais, bus);
  registrarRotasContestacao(app, { contestar, resolver, contestacoes: contestacaoRepo });

  // Módulo credenciamento — documentos (001 US3) + covalidação (002 US1), repo compartilhado
  const docRepo = new DocumentoRepositoryMemory();
  const docs = new GerirDocumentos(docRepo, new ObjectStorageMemory(), new PiiCipherDev());
  registrarRotasDocumentos(app, { docs });
  const covalidar = new Covalidar(docRepo, new AnaliseRepositoryMemory(), bus);
  registrarRotasCovalidacao(app, { covalidar });

  // Credenciamento — elegibilidade fiscal / bloqueio transitório (002 US2): fail-open+flag (AD-11/12)
  const metrics = new InMemoryAdapterMetrics();
  app.get('/metrics/adapters', async () => metrics.snapshot());
  const divida = new DividaMockGateway(new Map(), metrics);
  const bloqueios = new BloqueioRepositoryMemory();
  // Política de indisponibilidade configurável por ambiente (AD-12): default fail-open + flag CPL.
  const politicaInadimplencia = process.env.INADIMPLENCIA_POLICY === 'fail-closed' ? 'fail-closed' : 'fail-open';
  const elegibilidade = new VerificarElegibilidade(divida, bloqueios, bus, politicaInadimplencia);
  registrarRotasElegibilidade(app, { elegibilidade });

  // Credenciamento — regularização/contestação (002 US3): ponto único de pendências
  registrarRotasRegularizacao(app, { docs: docRepo, bloqueios, elegibilidade });

  // Auditoria — leitura/exportação da trilha (004). SOMENTE LEITURA: lê o mesmo auditRepo do escritor único.
  const consultarTrilha = new ConsultarTrilha(auditRepo);
  const exportarTrilha = new ExportarTrilha(consultarTrilha);
  registrarRotasAuditoria(app, { consultar: consultarTrilha, exportar: exportarTrilha });

  // Malote SEI (005 / Épico 6): geração assíncrona DURÁVEL (fila + retry, FR-002) + fragmentação + export idempotente
  let gerarMalote: GerarMalote;
  const filaMalote = new FilaMaloteMemory((job) => gerarMalote.processarJob(job)); // adaptador pg/redis na infra
  gerarMalote = new GerarMalote(new MaloteRepositoryMemory(), bus, filaMalote); // limite global SEI_MALOTE_LIMITE_MB
  registrarRotasMalote(app, { gerar: gerarMalote });

  // Tela única + Direitos do titular LGPD (006 / Épico 7)
  const solicitacoesRepo = new SolicitacaoRepositoryMemory();
  const direitosTitular = new GerirDireitosTitular(solicitacoesRepo, bus);
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
