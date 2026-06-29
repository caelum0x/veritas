export const meta = {
  name: 'veritas-platform',
  description: 'Build the Veritas verification platform as a production monorepo (600+ TS files) across many agents',
  phases: [
    { title: 'Scaffold', detail: 'monorepo root config + per-package manifests' },
    { title: 'Foundation', detail: 'core + contracts packages (canonical types)' },
    { title: 'Implement', detail: 'fan out ~160 agents across ~20 packages' },
    { title: 'Integrate', detail: 'install deps + typecheck' },
    { title: 'Fix', detail: 'bounded type-error repair pass' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'

// --------------------------------------------------------------------------
// Shared architecture spec injected into every agent
// --------------------------------------------------------------------------
const ARCH = [
  'PROJECT: Veritas — a production fact-verification & source-provenance platform.',
  'It exposes a verification engine as: (a) a paid CAP (CROO Agent Protocol) agent that settles USDC on Base,',
  '(b) a REST API, and (c) a TypeScript client SDK other agents/users call.',
  '',
  'GLOBAL RULES (follow exactly):',
  '- TypeScript, ESM, Node 18+. Strict mode. NEVER write tests, *.test.ts, or __tests__.',
  '- Every file MUST be self-contained, compile under strict TS, and be genuinely implemented (no `// TODO` stubs, no empty bodies).',
  '- Imports across packages use the alias form: `@veritas/<pkg>` (e.g. import { Result } from "@veritas/core").',
  '  Imports WITHIN a package use RELATIVE paths WITH the .js extension (ESM): `import { x } from "./x.js"`.',
  '- Prefer many small, cohesive files. Keep each file < ~150 lines.',
  '- Use zod for runtime validation where schemas are involved. Use `import { z } from "zod"`.',
  '- No `any` unless unavoidable; prefer `unknown` + narrowing. Immutable data (return new objects).',
  '- Add a one-line top-of-file comment describing the file purpose.',
  '- Do NOT run npm/tsc/git or install anything. ONLY create files with the Write tool at the EXACT absolute paths given.',
  '- Do NOT modify files outside your assigned list.',
  'OUTPUT: After writing, reply with ONLY a compact JSON line like {"written":N}. Do not echo file contents.',
].join('\n')

// --------------------------------------------------------------------------
// Package + dependency graph (for scaffold: tsconfig paths + package.json)
// --------------------------------------------------------------------------
const PACKAGES = [
  { key: 'core', name: '@veritas/core', dir: 'packages/core', deps: [] },
  { key: 'contracts', name: '@veritas/contracts', dir: 'packages/contracts', deps: ['core'] },
  { key: 'observability', name: '@veritas/observability', dir: 'packages/observability', deps: ['core'] },
  { key: 'config', name: '@veritas/config', dir: 'packages/config', deps: ['core'] },
  { key: 'auth', name: '@veritas/auth', dir: 'packages/auth', deps: ['core', 'contracts'] },
  { key: 'persistence', name: '@veritas/persistence', dir: 'packages/persistence', deps: ['core', 'contracts'] },
  { key: 'llm', name: '@veritas/llm', dir: 'packages/llm', deps: ['core', 'contracts', 'observability'] },
  { key: 'verification', name: '@veritas/verification', dir: 'packages/verification', deps: ['core', 'contracts', 'llm', 'observability'] },
  { key: 'cap', name: '@veritas/cap', dir: 'packages/cap', deps: ['core', 'contracts', 'verification', 'observability'] },
  { key: 'billing', name: '@veritas/billing', dir: 'packages/billing', deps: ['core', 'contracts', 'persistence'] },
  { key: 'webhooks', name: '@veritas/webhooks', dir: 'packages/webhooks', deps: ['core', 'contracts', 'persistence', 'observability'] },
  { key: 'notifications', name: '@veritas/notifications', dir: 'packages/notifications', deps: ['core', 'contracts'] },
  { key: 'agentstore', name: '@veritas/agent-store', dir: 'packages/agent-store', deps: ['core', 'contracts'] },
  { key: 'services', name: '@veritas/services', dir: 'packages/services', deps: ['core', 'contracts', 'persistence', 'verification', 'billing', 'webhooks', 'observability', 'auth'] },
  { key: 'sdk', name: '@veritas/sdk', dir: 'packages/sdk', deps: ['core', 'contracts'] },
  { key: 'container', name: '@veritas/container', dir: 'packages/container', deps: ['core', 'services', 'persistence', 'verification', 'llm', 'cap', 'billing', 'webhooks', 'observability', 'config', 'auth'] },
  { key: 'api', name: '@veritas/api', dir: 'apps/api', deps: ['core', 'contracts', 'services', 'container', 'observability', 'auth', 'config'] },
  { key: 'worker', name: '@veritas/worker', dir: 'apps/worker', deps: ['core', 'contracts', 'services', 'container', 'observability', 'config'] },
  { key: 'capagent', name: '@veritas/cap-agent', dir: 'apps/cap-agent', deps: ['core', 'contracts', 'cap', 'verification', 'llm', 'container', 'observability', 'config'] },
]

// --------------------------------------------------------------------------
// Domain vocabulary
// --------------------------------------------------------------------------
const ENTITIES = [
  'claim', 'citation', 'evidence', 'source', 'verdict', 'report', 'provenance',
  'job', 'negotiation', 'order', 'delivery', 'agent', 'service', 'apiKey',
  'wallet', 'usage', 'invoice', 'plan', 'subscription', 'webhook',
  'webhookDelivery', 'auditLog', 'user', 'organization', 'membership',
  'session', 'settlement', 'transaction', 'notification', 'idempotencyKey',
]
const PERSIST = ENTITIES.filter((e) => !['claim', 'citation', 'evidence', 'source', 'verdict', 'provenance'].includes(e))
const API_RES = [
  'verification-job', 'report', 'agent', 'service', 'api-key', 'order',
  'negotiation', 'delivery', 'wallet', 'usage', 'invoice', 'plan',
  'subscription', 'webhook', 'audit-log', 'user', 'organization',
  'session', 'settlement', 'transaction', 'health', 'me',
]
const SDK_RES = [
  'verification', 'reports', 'agents', 'services', 'orders', 'wallets',
  'usage', 'invoices', 'plans', 'subscriptions', 'webhooks', 'apiKeys',
  'organizations', 'settlements', 'transactions', 'me',
]
const SERVICES = [
  'verification-job', 'report', 'agent', 'service-catalog', 'api-key', 'order',
  'negotiation', 'delivery', 'wallet', 'usage-metering', 'invoice', 'plan',
  'subscription', 'webhook', 'audit-log', 'user', 'organization', 'membership',
  'session', 'settlement', 'transaction', 'notification', 'idempotency',
  'rate-limit', 'agent-registration', 'pricing', 'quota', 'export',
]

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const f = (p, d) => ({ p, d })

// --------------------------------------------------------------------------
// Per-package file manifests (excludes core + contracts; those are foundation)
// --------------------------------------------------------------------------
function filesFor(key) {
  const out = []
  if (key === 'observability') {
    out.push(
      f('logger.ts', 'pino-style structured logger interface + console impl'),
      f('logger-factory.ts', 'createLogger(level) factory'),
      f('log-level.ts', 'LogLevel enum + ranking'),
      f('redaction.ts', 'redact secrets/PII from log fields'),
      f('context.ts', 'AsyncLocalStorage request/trace context'),
      f('correlation.ts', 'correlation/request id helpers'),
      f('metrics/metric.ts', 'Counter/Gauge/Histogram interfaces'),
      f('metrics/registry.ts', 'in-memory metrics registry'),
      f('metrics/timers.ts', 'timing helpers'),
      f('tracing/span.ts', 'Span + Tracer interfaces'),
      f('tracing/noop-tracer.ts', 'no-op tracer impl'),
      f('audit/audit-event.ts', 'audit event type'),
      f('audit/audit-logger.ts', 'audit logger interface + impl'),
      f('health/health-check.ts', 'HealthCheck + aggregate status'),
      f('index.ts', 're-export public surface'),
    )
  } else if (key === 'config') {
    out.push(
      f('env.ts', 'read+coerce process.env helpers'),
      f('schema.ts', 'zod schema for the full platform config'),
      f('defaults.ts', 'default config values'),
      f('load.ts', 'loadConfig() fail-fast loader'),
      f('app-config.ts', 'AppConfig type'),
      f('sections/croo.ts', 'CAP/CROO config section'),
      f('sections/anthropic.ts', 'Anthropic config section'),
      f('sections/server.ts', 'HTTP server config section'),
      f('sections/database.ts', 'persistence config section'),
      f('sections/billing.ts', 'billing config section'),
      f('sections/verification.ts', 'verification tuning section'),
      f('sections/observability.ts', 'logging/metrics config section'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'auth') {
    out.push(
      f('api-key.ts', 'ApiKey value object + parsing (prefix veritas_sk_)'),
      f('api-key-hasher.ts', 'hash/verify api keys (sha256+salt)'),
      f('scopes.ts', 'Scope enum (verify:read, verify:write, billing:read...)'),
      f('permission.ts', 'permission check helpers'),
      f('principal.ts', 'authenticated principal type'),
      f('authenticator.ts', 'Authenticator interface'),
      f('api-key-authenticator.ts', 'authenticate by api key via key store'),
      f('signature.ts', 'HMAC request signing/verification'),
      f('token.ts', 'opaque session token gen/verify'),
      f('rate-limit-key.ts', 'derive rate-limit key from principal'),
      f('ip-allowlist.ts', 'ip allow/deny checks'),
      f('errors.ts', 'auth error types'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'persistence') {
    out.push(
      f('base-repository.ts', 'BaseRepository<T> interface (findById,list,create,update,delete)'),
      f('query.ts', 'filter/sort/pagination query types'),
      f('pagination.ts', 'cursor pagination helpers'),
      f('unit-of-work.ts', 'UnitOfWork interface + memory impl'),
      f('repository-registry.ts', 'registry mapping entity -> repo'),
      f('errors.ts', 'NotFound/Conflict persistence errors'),
      f('memory/memory-store.ts', 'generic in-memory keyed store with clone-on-write'),
      f('index.ts', 're-export all repositories'),
    )
    for (const e of PERSIST) {
      out.push(
        f(`repositories/${e}.repository.ts`, `${cap(e)}Repository interface`),
        f(`memory/${e}.memory-repository.ts`, `in-memory ${cap(e)}Repository impl`),
        f(`mappers/${e}.mapper.ts`, `map ${cap(e)} <-> persistence row`),
      )
    }
  } else if (key === 'llm') {
    out.push(
      f('provider.ts', 'VerifierLLM provider interface (extractClaims, research, adjudicate)'),
      f('types.ts', 'ClaimAdjudication, ResearchResult, EvidenceItem types'),
      f('registry.ts', 'provider registry + selection'),
      f('fallback-provider.ts', 'wraps providers with refusal/error fallback'),
      f('mock-provider.ts', 'deterministic mock provider for local/dev'),
      f('token-accounting.ts', 'track token usage + cost'),
      f('rate-limiter.ts', 'token-bucket limiter for model calls'),
      f('errors.ts', 'llm error types'),
      f('anthropic/client.ts', 'thin Anthropic SDK client factory'),
      f('anthropic/anthropic-provider.ts', 'VerifierLLM impl using Claude + web_search'),
      f('anthropic/research.ts', 'phase 1: web-search research call'),
      f('anthropic/adjudicate.ts', 'phase 2: structured adjudication call'),
      f('anthropic/extract-claims.ts', 'claim extraction structured call'),
      f('anthropic/calibrate.ts', 'confidence calibration'),
      f('anthropic/message.ts', 'create-message wrapper + pause_turn loop'),
      f('anthropic/text.ts', 'extract text/citations from message content'),
      f('anthropic/model.ts', 'model ids + effort config'),
      f('prompts/system.ts', 'system prompt builders'),
      f('prompts/research.ts', 'research prompt template'),
      f('prompts/adjudicate.ts', 'adjudication prompt template'),
      f('prompts/extract.ts', 'extraction prompt template'),
      f('schemas/adjudication.ts', 'JSON schema for structured adjudication'),
      f('schemas/extraction.ts', 'JSON schema for claim extraction'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'verification') {
    out.push(
      f('engine.ts', 'runVerification orchestration'),
      f('engine-options.ts', 'EngineOptions type'),
      f('pipeline/pipeline.ts', 'compose ordered stages'),
      f('pipeline/stage.ts', 'Stage interface + context'),
      f('pipeline/context.ts', 'verification run context'),
      f('stages/normalize.ts', 'normalize request input'),
      f('stages/resolve-claims.ts', 'use claims or extract from text'),
      f('stages/dedupe-claims.ts', 'dedupe near-identical claims'),
      f('stages/research.ts', 'gather evidence per claim'),
      f('stages/adjudicate.ts', 'adjudicate each claim'),
      f('stages/score.ts', 'compute trust score + counts'),
      f('stages/assemble.ts', 'assemble final report'),
      f('scoring/trust-score.ts', 'confidence-weighted aggregate'),
      f('scoring/confidence.ts', 'confidence normalization'),
      f('scoring/weights.ts', 'verdict weight table'),
      f('provenance/canonical.ts', 'canonical (key-sorted) JSON'),
      f('provenance/hash.ts', 'sha256 content hash'),
      f('provenance/attestation.ts', 'build provenance attestation block'),
      f('provenance/signature.ts', 'optional ed25519-style signing stub interface'),
      f('report/builder.ts', 'VerificationReport builder'),
      f('report/summary.ts', 'human summary text'),
      f('report/markdown.ts', 'render report as markdown'),
      f('source/ranking.ts', 'rank sources by authority'),
      f('source/dedupe.ts', 'dedupe citation urls'),
      f('source/domain-filter.ts', 'apply allowedDomains'),
      f('claim/splitter.ts', 'split compound claims'),
      f('claim/normalizer.ts', 'normalize claim text'),
      f('concurrency.ts', 'bounded map-with-concurrency'),
      f('errors.ts', 'verification errors'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'cap') {
    out.push(
      f('client.ts', 'AgentClient factory from config'),
      f('provider.ts', 'VeritasProvider CAP event loop'),
      f('event-router.ts', 'route CAP events to handlers'),
      f('lifecycle/negotiation-created.ts', 'validate + accept/reject negotiation'),
      f('lifecycle/order-paid.ts', 'run verification + deliver'),
      f('lifecycle/order-completed.ts', 'log settlement'),
      f('lifecycle/order-rejected.ts', 'cleanup'),
      f('lifecycle/order-expired.ts', 'cleanup'),
      f('request-parser.ts', 'parse + validate CAP requirements'),
      f('delivery-builder.ts', 'build Schema deliverable from report'),
      f('negotiation-policy.ts', 'accept/reject policy'),
      f('pricing.ts', 'price quoting helpers'),
      f('settlement.ts', 'settlement bookkeeping'),
      f('reconnect.ts', 'reconnect/backoff helpers'),
      f('pending-store.ts', 'orderId -> request cache w/ API fallback'),
      f('metrics.ts', 'cap provider metrics'),
      f('errors.ts', 'cap errors'),
      f('types.ts', 'internal cap types'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'billing') {
    out.push(
      f('metering.ts', 'usage metering events'),
      f('usage-aggregator.ts', 'aggregate usage per period'),
      f('plans.ts', 'plan catalog + limits'),
      f('pricing.ts', 'compute charges from usage'),
      f('invoice-generator.ts', 'generate invoices'),
      f('ledger.ts', 'append-only ledger'),
      f('usdc-accounting.ts', 'USDC base-unit accounting helpers'),
      f('settlement-reconciler.ts', 'reconcile CAP settlements'),
      f('quota.ts', 'quota enforcement'),
      f('money.ts', 'Money value object (USDC 6-decimals)'),
      f('reports.ts', 'billing summary reports'),
      f('errors.ts', 'billing errors'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'webhooks') {
    out.push(
      f('event.ts', 'WebhookEvent envelope + types'),
      f('signer.ts', 'HMAC payload signer'),
      f('verifier.ts', 'verify incoming signatures'),
      f('dispatcher.ts', 'dispatch + retry deliveries'),
      f('retry-policy.ts', 'exponential backoff policy'),
      f('delivery-tracker.ts', 'track delivery attempts'),
      f('registry.ts', 'subscription registry'),
      f('event-types.ts', 'enumerate webhook event types'),
      f('errors.ts', 'webhook errors'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'notifications') {
    out.push(
      f('channel.ts', 'NotificationChannel interface'),
      f('channels/log-channel.ts', 'log channel'),
      f('channels/webhook-channel.ts', 'webhook channel'),
      f('channels/email-channel.ts', 'email channel (transport interface)'),
      f('templates.ts', 'message templates'),
      f('sender.ts', 'multi-channel sender'),
      f('preferences.ts', 'per-recipient channel prefs'),
      f('types.ts', 'notification types'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'agentstore') {
    out.push(
      f('listing.ts', 'Agent Store listing model'),
      f('service-descriptor.ts', 'service descriptor (price, schema, sla)'),
      f('registration.ts', 'register agent+service payloads'),
      f('catalog-client.ts', 'discover services on the store'),
      f('manifest.ts', 'build the Veritas service manifest'),
      f('pricing-tier.ts', 'pricing tiers'),
      f('types.ts', 'store types'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'services') {
    out.push(
      f('base-service.ts', 'shared service base (logger, ctx)'),
      f('service-context.ts', 'request-scoped context (principal, traceId)'),
      f('errors.ts', 'application-layer errors'),
      f('result.ts', 'service result helpers'),
      f('index.ts', 're-export'),
    )
    for (const s of SERVICES) {
      out.push(
        f(`${s}/${s}.service.ts`, `${cap(s)} application service (use-cases)`),
        f(`${s}/${s}.dto.ts`, `input/output DTOs for ${s}`),
      )
    }
  } else if (key === 'sdk') {
    out.push(
      f('client.ts', 'VeritasClient root client'),
      f('config.ts', 'SDK config + defaults'),
      f('http/transport.ts', 'fetch-based transport interface'),
      f('http/fetch-transport.ts', 'fetch transport impl'),
      f('http/request.ts', 'request builder'),
      f('http/response.ts', 'response parsing'),
      f('http/retry.ts', 'retry with backoff'),
      f('http/errors.ts', 'SDK error classes'),
      f('http/pagination.ts', 'auto-paginating iterator'),
      f('a2a/cap-hire.ts', 'hire Veritas over CAP (A2A helper)'),
      f('a2a/wait-for-completion.ts', 'await order completion'),
      f('a2a/report-reader.ts', 'parse delivered report'),
      f('types.ts', 'public SDK types'),
      f('errors.ts', 'public error exports'),
      f('index.ts', 're-export'),
    )
    for (const r of SDK_RES) {
      out.push(f(`resources/${r}.ts`, `${cap(r)} resource client`))
    }
  } else if (key === 'container') {
    out.push(
      f('tokens.ts', 'DI tokens'),
      f('container.ts', 'tiny DI container'),
      f('build-container.ts', 'wire all services + repos + providers'),
      f('modules/persistence.module.ts', 'register repositories'),
      f('modules/services.module.ts', 'register services'),
      f('modules/verification.module.ts', 'register engine + llm'),
      f('modules/cap.module.ts', 'register cap provider'),
      f('modules/billing.module.ts', 'register billing'),
      f('modules/webhooks.module.ts', 'register webhooks'),
      f('modules/observability.module.ts', 'register logger/metrics'),
      f('types.ts', 'container types'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'api') {
    out.push(
      f('main.ts', 'API entrypoint (bootstrap + listen)'),
      f('app.ts', 'build express app + mount routers'),
      f('server.ts', 'http server lifecycle'),
      f('router.ts', 'top-level router assembly'),
      f('openapi/spec.ts', 'OpenAPI document builder'),
      f('openapi/components.ts', 'shared OpenAPI components'),
      f('middleware/request-id.ts', 'attach request id'),
      f('middleware/logging.ts', 'request logging'),
      f('middleware/error-handler.ts', 'central error handler'),
      f('middleware/not-found.ts', '404 handler'),
      f('middleware/auth.ts', 'api-key auth middleware'),
      f('middleware/rate-limit.ts', 'rate limit middleware'),
      f('middleware/idempotency.ts', 'idempotency-key middleware'),
      f('middleware/validate.ts', 'zod body/query validation'),
      f('middleware/cors.ts', 'cors config'),
      f('middleware/body-limit.ts', 'body size limit'),
      f('middleware/pagination.ts', 'parse pagination params'),
      f('middleware/metrics.ts', 'request metrics'),
      f('http/async-handler.ts', 'wrap async handlers'),
      f('http/api-error.ts', 'HTTP ApiError + mapping'),
      f('http/responder.ts', 'consistent response envelope'),
      f('http/problem.ts', 'problem+json formatting'),
      f('index.ts', 're-export app factory'),
    )
    for (const r of API_RES) {
      out.push(
        f(`routes/${r}.routes.ts`, `${cap(r)} route definitions`),
        f(`controllers/${r}.controller.ts`, `${cap(r)} controller handlers`),
        f(`validators/${r}.validator.ts`, `${cap(r)} request validators (zod)`),
      )
    }
  } else if (key === 'worker') {
    out.push(
      f('main.ts', 'worker entrypoint'),
      f('worker.ts', 'poll + dispatch loop'),
      f('queue/queue.ts', 'Queue interface'),
      f('queue/memory-queue.ts', 'in-memory queue impl'),
      f('queue/job.ts', 'Job envelope type'),
      f('scheduler.ts', 'cron-like scheduler'),
      f('dispatcher.ts', 'route jobs to handlers'),
      f('handlers/run-verification.handler.ts', 'process verification job'),
      f('handlers/deliver-webhook.handler.ts', 'process webhook delivery'),
      f('handlers/generate-invoice.handler.ts', 'monthly invoice job'),
      f('handlers/reconcile-settlements.handler.ts', 'settlement reconcile job'),
      f('handlers/expire-orders.handler.ts', 'expire stale orders'),
      f('handlers/aggregate-usage.handler.ts', 'usage rollup job'),
      f('handler.ts', 'JobHandler interface'),
      f('config.ts', 'worker config'),
      f('index.ts', 're-export'),
    )
  } else if (key === 'capagent') {
    out.push(
      f('main.ts', 'production CAP provider entrypoint'),
      f('bootstrap.ts', 'wire cap provider via container'),
      f('health.ts', 'agent health probe'),
      f('shutdown.ts', 'graceful shutdown'),
      f('runtime.ts', 'runtime supervisor (reconnect)'),
      f('index.ts', 're-export'),
    )
  }
  return out
}

// --------------------------------------------------------------------------
// Build work units (chunks of files per package)
// --------------------------------------------------------------------------
function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

const IMPL_PACKAGES = PACKAGES.filter((p) => p.key !== 'core' && p.key !== 'contracts')
const units = []
let totalFiles = 0
for (const pkg of IMPL_PACKAGES) {
  const files = filesFor(pkg.key)
  totalFiles += files.length
  const groups = chunk(files, 5)
  groups.forEach((g, i) => {
    units.push({ pkg, allFiles: files, assigned: g, idx: i, groups: groups.length })
  })
}

// examples package (runnable "how users use it" scripts) — its own dir, depends on sdk
const EXAMPLES = [
  f('verify-claims.ts', 'verify a list of claims with the engine directly'),
  f('verify-text.ts', 'fact-check a block of generated text'),
  f('sdk-quickstart.ts', 'use @veritas/sdk to call the hosted API'),
  f('sdk-batch-verify.ts', 'batch verify many items via the SDK'),
  f('sdk-pagination.ts', 'iterate reports with auto-pagination'),
  f('hire-via-cap.ts', 'hire Veritas over CAP and read the report (A2A)'),
  f('a2a-research-agent.ts', 'a research agent that hires Veritas before answering'),
  f('run-cap-provider.ts', 'start the Veritas CAP provider'),
  f('run-api-server.ts', 'start the REST API'),
  f('run-worker.ts', 'start the background worker'),
  f('webhook-receiver.ts', 'verify + handle Veritas webhooks'),
  f('create-api-key.ts', 'provision an api key via services'),
  f('register-on-store.ts', 'build the agent-store listing manifest'),
  f('trust-score-report.ts', 'render a report as markdown'),
  f('mock-verification.ts', 'run the engine with the mock LLM provider'),
]
totalFiles += EXAMPLES.length
{
  const groups = chunk(EXAMPLES, 5)
  groups.forEach((g, i) => {
    units.push({
      pkg: { key: 'examples', name: 'examples', dir: 'examples', deps: ['sdk', 'verification', 'cap', 'llm', 'services', 'container', 'config'] },
      allFiles: EXAMPLES, assigned: g, idx: i, groups: groups.length,
    })
  })
}

// --------------------------------------------------------------------------
// Schemas for structured agent returns
// --------------------------------------------------------------------------
const SHEET_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    importPath: { type: 'string' },
    written: { type: 'number' },
    exports: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { name: { type: 'string' }, kind: { type: 'string' }, note: { type: 'string' } },
        required: ['name', 'kind', 'note'],
      },
    },
  },
  required: ['importPath', 'written', 'exports'],
}

const TSC_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    errorCount: { type: 'number' },
    topFiles: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { file: { type: 'string' }, errors: { type: 'number' }, sample: { type: 'string' } },
        required: ['file', 'errors', 'sample'],
      },
    },
  },
  required: ['errorCount', 'topFiles'],
}

// ==========================================================================
// PHASE 1 — Scaffold
// ==========================================================================
phase('Scaffold')
const pkgJson = JSON.stringify(PACKAGES.map((p) => ({ name: p.name, dir: p.dir, deps: p.deps })))
const scaffoldPrompt = [
  ARCH,
  '',
  'You are scaffolding a TypeScript monorepo at ' + BASE + '. Create EXACTLY these files (absolute paths):',
  '',
  '1) ' + BASE + '/package.json — a SINGLE root package (NO workspaces array). Fields:',
  '   - "name":"veritas-platform","private":true,"type":"module","engines":{"node":">=18"}',
  '   - scripts: "typecheck":"tsc -p tsconfig.json --noEmit", "build":"tsc -p tsconfig.json",',
  '     "api":"tsx apps/api/src/main.ts","worker":"tsx apps/worker/src/main.ts","agent":"tsx apps/cap-agent/src/main.ts"',
  '   - dependencies: "@anthropic-ai/sdk":"^0.106.0","@croo-network/sdk":"^0.2.1","zod":"^3.23.8",',
  '     "express":"^4.19.2","pino":"^9.3.2","nanoid":"^5.0.7","dotenv":"^16.4.5"',
  '   - devDependencies: "typescript":"^5.5.4","tsx":"^4.16.2","@types/node":"^20.14.0","@types/express":"^4.17.21"',
  '',
  '2) ' + BASE + '/tsconfig.json — strict, ESM. compilerOptions:',
  '   target ES2022, module ESNext, moduleResolution Bundler, lib ["ES2022"], strict true,',
  '   noUncheckedIndexedAccess true, esModuleInterop true, skipLibCheck true, declaration false,',
  '   noEmit true, resolveJsonModule true, forceConsistentCasingInFileNames true, types ["node"],',
  '   baseUrl ".", and "paths" mapping EACH package to its src: for every package below add',
  '   "@veritas/<short>": ["<dir>/src/index.ts"] AND "@veritas/<short>/*": ["<dir>/src/*"].',
  '   (short = name without the @veritas/ prefix; e.g. @veritas/core -> packages/core/src/index.ts).',
  '   "include": ["packages/*/src/**/*.ts","apps/*/src/**/*.ts","examples/**/*.ts"].',
  '   "exclude": ["node_modules","legacy","dist"].',
  '',
  '3) For EACH package below, create <dir>/package.json with {"name","version":"1.0.0","type":"module","main":"src/index.ts","types":"src/index.ts"} (inert metadata, NOT a workspace).',
  '',
  '4) ' + BASE + '/README.platform.md — a short top-level map of the monorepo (packages + apps + how to run api/worker/agent).',
  '',
  'PACKAGES (name, dir, deps): ' + pkgJson,
  '',
  'IMPORTANT: source files live under <dir>/src/. Note that ALL package src dirs share one tsconfig program; no project references, no build needed. Reply only {"written":N}.',
].join('\n')

const scaffold = await agent(scaffoldPrompt, { label: 'scaffold', phase: 'Scaffold', effort: 'high' })
log('scaffold complete')

// ==========================================================================
// PHASE 2 — Foundation (core, then contracts)
// ==========================================================================
phase('Foundation')
const corePrompt = [
  ARCH,
  '',
  'Implement the @veritas/core package at ' + BASE + '/packages/core/src/.',
  'This is the shared kernel every other package imports. Create ~45 small files, including:',
  '- result.ts (Result<T,E> = Ok|Err with helpers ok(), err(), isOk, map, mapErr, unwrap)',
  '- errors/base-error.ts (AppError base with code, message, cause, details), plus errors for',
  '  not-found, conflict, validation, unauthorized, forbidden, rate-limited, unavailable, internal (one file each) and errors/index.ts',
  '- ids.ts (branded Id types + nanoid-based generators: newId(prefix)), brand.ts',
  '- time.ts (Clock interface + systemClock + Instant helpers), iso.ts',
  '- json.ts (canonicalize: recursive key-sort stringify; safeParseJson)',
  '- hashing.ts (sha256Hex, contentHash(value) => "sha256:..." over canonical json)',
  '- money.ts (Usdc value object, 6 decimals, base-unit math, format)',
  '- pagination.ts (Page<T>, PageRequest, Cursor encode/decode)',
  '- concurrency.ts (mapWithConcurrency, pLimit)',
  '- retry.ts (withRetry + backoff), backoff.ts',
  '- assert.ts (invariant, assertNever), guards.ts (isObject, isString...)',
  '- enums.ts (Verdict SUPPORTED|REFUTED|UNVERIFIABLE, OrderStatus, JobStatus, etc.)',
  '- events/domain-event.ts (DomainEvent base), events/event-bus.ts (interface + in-memory), events/index.ts',
  '- logger-port.ts (Logger interface re-declared here to avoid cross-dep cycles)',
  '- maybe.ts (Option), tuple.ts, range.ts, slug.ts, redact.ts',
  '- index.ts re-exporting the PUBLIC surface.',
  'Every file must compile under strict TS and have real implementations. Use nanoid (import { nanoid } from "nanoid").',
  'After writing, return the structured cheatsheet of the most important exports other packages will import.',
].join('\n')
const coreSheet = await agent(corePrompt, { label: 'core', phase: 'Foundation', effort: 'high', schema: SHEET_SCHEMA })

const contractsPrompt = [
  ARCH,
  '',
  'Implement the @veritas/contracts package at ' + BASE + '/packages/contracts/src/.',
  'It defines zod schemas + inferred TS types + DTOs for every domain entity. It imports enums/value-objects from @veritas/core.',
  'Core exports available: ' + JSON.stringify(coreSheet && coreSheet.exports ? coreSheet.exports.map((e) => e.name) : []),
  '',
  'Create one schema file per entity under schemas/: ' + ENTITIES.join(', ') + '.',
  'Each schemas/<entity>.ts exports <Entity>Schema (zod), the inferred <Entity> type, plus Create/Update input schemas where sensible.',
  'Also create:',
  '- the public verification contract: verification-request.ts (VerificationRequestSchema: {claims?:string[], text?:string, context?:string, options?:{allowedDomains?:string[]}} with refinement) and verification-report.ts (VerificationReportSchema v1: schema literal "veritas.report.v1", summary, trustScore 0-100, counts, claims[] (claim, verdict, confidence 0-1, reasoning, citations[]), provenance{contentHash,verifier,verifierVersion,model,effort,createdAt,claimCount,sourceCount}).',
  '- common.ts (shared field schemas: id, timestamps, money, pagination), api-envelope.ts (success/error response envelope), index.ts.',
  'Keep schemas Anthropic-structured-output friendly where used by the engine (avoid min/maxLength on the adjudication shape).',
  'Every file compiles under strict TS. Return the cheatsheet of exported schema + type names.',
].join('\n')
const contractsSheet = await agent(contractsPrompt, { label: 'contracts', phase: 'Foundation', effort: 'high', schema: SHEET_SCHEMA })

function names(sheet) {
  return sheet && sheet.exports ? sheet.exports.map((e) => `${e.name} (${e.kind})`).join(', ') : '(none reported)'
}
const CHEAT = [
  'SHARED FOUNDATION — import these, do not redefine them:',
  '@veritas/core exports: ' + names(coreSheet),
  '@veritas/contracts exports: ' + names(contractsSheet),
  'Reminder: cross-package import alias is @veritas/<pkg>; within-package imports are relative with .js extension.',
].join('\n')

// ==========================================================================
// PHASE 3 — Implement (fan out)
// ==========================================================================
phase('Implement')
log(`fanning out ${units.length} units covering ${totalFiles} files across ${IMPL_PACKAGES.length + 1} packages`)

function implPrompt(u) {
  const fileList = u.allFiles.map((x) => `  - src/${x.p} : ${x.d}`).join('\n')
  const assigned = u.assigned.map((x) => `${BASE}/${u.pkg.dir}/src/${x.p}`).join('\n')
  const depAliases = (u.pkg.deps || []).map((d) => '@veritas/' + d).join(', ')
  return [
    ARCH,
    '',
    CHEAT,
    '',
    `You implement part of the ${u.pkg.name} package (dir ${u.pkg.dir}). It may import from: ${depAliases || '(only core/contracts)'}.`,
    'The FULL file list of this package (so you know sibling modules to import via relative ./paths .js):',
    fileList,
    '',
    'WRITE ONLY these files (exact absolute paths), fully implemented and strict-TS-clean:',
    assigned,
    '',
    'Implement real, coherent logic consistent with the file purposes above and the shared foundation. ' +
    'If you write src/index.ts, re-export this package\'s public modules. ' +
    'Use interfaces from sibling files by their described responsibility. Reply only {"written":N}.',
  ].join('\n')
}

const implResults = await parallel(
  units.map((u) => () =>
    agent(implPrompt(u), {
      label: `impl:${u.pkg.key}/${u.idx + 1}of${u.groups}`,
      phase: 'Implement',
      model: 'sonnet',
      effort: 'medium',
    }),
  ),
)
const implDone = implResults.filter(Boolean).length
log(`implementation agents finished: ${implDone}/${units.length}`)

// ==========================================================================
// PHASE 4 — Integrate (install + typecheck)
// ==========================================================================
phase('Integrate')
const installPrompt = [
  'Run a dependency install for the monorepo at ' + BASE + '.',
  'cd into ' + BASE + ' and run `npm install` (allow up to 10 minutes).',
  'Then report the outcome in one line. Do not edit any source files.',
].join('\n')
await agent(installPrompt, { label: 'install', phase: 'Integrate', effort: 'low' })

const tscPrompt = [
  'Typecheck the monorepo at ' + BASE + '.',
  'Run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 | tee /tmp/veritas-tsc.txt | tail -5` and also `grep -c "error TS" /tmp/veritas-tsc.txt` for the count.',
  'Identify the files with the most errors: `grep -oE "^[^(]+\\.ts" /tmp/veritas-tsc.txt | sort | uniq -c | sort -rn | head -25`.',
  'Return errorCount and topFiles (file, error count, one representative error line as sample). Do not edit any files.',
].join('\n')
const tsc1 = await agent(tscPrompt, { label: 'typecheck', phase: 'Integrate', schema: TSC_SCHEMA, effort: 'low' })
log(`typecheck after implement: ${tsc1 ? tsc1.errorCount : 'unknown'} errors`)

// ==========================================================================
// PHASE 5 — Fix (bounded repair of the most-broken files)
// ==========================================================================
phase('Fix')
let lastErrors = tsc1 ? tsc1.errorCount : 0
if (tsc1 && tsc1.errorCount > 0) {
  const targets = (tsc1.topFiles || []).slice(0, 24)
  await parallel(
    targets.map((t) => () =>
      agent(
        [
          ARCH,
          '',
          CHEAT,
          '',
          `Fix TypeScript errors in the monorepo file ${BASE}/${t.file} (and only that file).`,
          `It currently has ~${t.errors} type errors. Representative error: ${t.sample}`,
          'Steps: Read the file, run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 | grep "' + t.file + '"` to see ITS errors, then Edit ONLY that file to make those errors go away. ' +
          'Fix imports (alias vs relative .js), missing exports you can add locally, type mismatches, and unused-strict issues. Do not weaken types with `any` unless unavoidable. Do not touch other files.',
          'Reply only {"fixed":true}.',
        ].join('\n'),
        { label: `fix:${t.file.split('/').pop()}`, phase: 'Fix', model: 'sonnet', effort: 'medium' },
      ),
    ),
  )
  const tsc2 = await agent(tscPrompt, { label: 'typecheck-2', phase: 'Fix', schema: TSC_SCHEMA, effort: 'low' })
  lastErrors = tsc2 ? tsc2.errorCount : lastErrors
  log(`typecheck after fix: ${lastErrors} errors`)
}

return {
  packages: PACKAGES.length,
  unitsDispatched: units.length,
  filesPlanned: totalFiles,
  implAgentsCompleted: implDone,
  tscErrorsInitial: tsc1 ? tsc1.errorCount : null,
  tscErrorsFinal: lastErrors,
}
