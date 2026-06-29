export const meta = {
  name: 'veritas-expand',
  description: 'Expand Veritas into a full enterprise platform: +17 packages, +5 apps, ~500 more TS files',
  phases: [
    { title: 'Scaffold', detail: 'merge new packages into root tsconfig/package.json' },
    { title: 'Discover', detail: 'read core/contracts exports into a cheatsheet' },
    { title: 'Implement', detail: 'fan out ~100 agents across new enterprise modules' },
    { title: 'Integrate', detail: 'install + typecheck' },
    { title: 'Fix', detail: 'bounded type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'

const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform (CAP agent + REST API + SDK).',
  'This workflow ADDS new enterprise packages/apps to an EXISTING monorepo at ' + BASE + '.',
  'GLOBAL RULES (follow exactly):',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs/empty bodies). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation (import { z } from "zod"). Prefer unknown+narrowing over any. Immutable data.',
  '- Existing foundation packages you may import: @veritas/core, @veritas/contracts, @veritas/observability, @veritas/persistence, @veritas/auth, @veritas/services, @veritas/config (already implemented).',
  '- Do NOT run npm/tsc/git unless told. ONLY Write files at the EXACT absolute paths given. Do not modify files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}. Do not echo file contents.',
].join('\n')

// New, disjoint packages/apps (no path collisions with the base build)
const PACKAGES = [
  { key: 'tenancy', name: '@veritas/tenancy', dir: 'packages/tenancy', deps: ['core', 'contracts'] },
  { key: 'rbac', name: '@veritas/rbac', dir: 'packages/rbac', deps: ['core', 'contracts', 'auth'] },
  { key: 'eventsourcing', name: '@veritas/event-sourcing', dir: 'packages/event-sourcing', deps: ['core', 'contracts'] },
  { key: 'messaging', name: '@veritas/messaging', dir: 'packages/messaging', deps: ['core', 'observability'] },
  { key: 'cache', name: '@veritas/cache', dir: 'packages/cache', deps: ['core'] },
  { key: 'ratelimit', name: '@veritas/rate-limit', dir: 'packages/rate-limit', deps: ['core', 'cache'] },
  { key: 'flags', name: '@veritas/feature-flags', dir: 'packages/feature-flags', deps: ['core'] },
  { key: 'i18n', name: '@veritas/i18n', dir: 'packages/i18n', deps: ['core'] },
  { key: 'crypto', name: '@veritas/crypto', dir: 'packages/crypto', deps: ['core'] },
  { key: 'blockchain', name: '@veritas/blockchain', dir: 'packages/blockchain', deps: ['core', 'config'] },
  { key: 'search', name: '@veritas/search', dir: 'packages/search', deps: ['core', 'contracts'] },
  { key: 'analytics', name: '@veritas/analytics', dir: 'packages/analytics', deps: ['core', 'contracts', 'persistence'] },
  { key: 'scheduler', name: '@veritas/scheduler', dir: 'packages/scheduler', deps: ['core', 'observability'] },
  { key: 'email', name: '@veritas/email', dir: 'packages/email', deps: ['core'] },
  { key: 'storage', name: '@veritas/storage', dir: 'packages/storage', deps: ['core'] },
  { key: 'migrations', name: '@veritas/migrations', dir: 'packages/migrations', deps: ['core', 'persistence'] },
  { key: 'gatewaycore', name: '@veritas/gateway-core', dir: 'packages/gateway-core', deps: ['core', 'contracts', 'auth', 'ratelimit'] },
]
const APPS = [
  { key: 'admin', name: '@veritas/admin-api', dir: 'apps/admin-api', deps: ['core', 'contracts', 'services', 'auth', 'rbac', 'tenancy', 'observability', 'config'] },
  { key: 'graphql', name: '@veritas/graphql', dir: 'apps/graphql', deps: ['core', 'contracts', 'services', 'auth', 'observability'] },
  { key: 'cli', name: '@veritas/cli', dir: 'apps/cli', deps: ['core', 'contracts', 'services', 'sdk', 'migrations', 'config'] },
  { key: 'schedulerapp', name: '@veritas/scheduler-app', dir: 'apps/scheduler-app', deps: ['core', 'scheduler', 'services', 'container', 'config'] },
  { key: 'bff', name: '@veritas/bff', dir: 'apps/bff', deps: ['core', 'contracts', 'gateway-core', 'sdk', 'auth', 'observability'] },
]
const ALL = [...PACKAGES, ...APPS]

const AGGREGATES = ['verification-job', 'order', 'agent', 'invoice', 'subscription', 'wallet', 'webhook', 'organization', 'session', 'settlement']
const ADMIN_RES = ['tenant', 'user', 'organization', 'role', 'permission', 'plan', 'subscription', 'api-key', 'feature-flag', 'audit-log', 'agent', 'service', 'usage', 'invoice', 'settlement']
const GQL_ENTITIES = ['claim', 'citation', 'verdict', 'report', 'provenance', 'job', 'order', 'negotiation', 'delivery', 'agent', 'service', 'apiKey', 'wallet', 'usage', 'invoice', 'plan', 'subscription', 'webhook', 'auditLog', 'user', 'organization', 'session', 'settlement', 'transaction', 'tenant']
const CLI_CMDS = ['verify', 'verify-text', 'reports-list', 'reports-get', 'keys-create', 'keys-list', 'keys-revoke', 'agents-list', 'orders-list', 'orders-get', 'migrate-up', 'migrate-down', 'serve-api', 'serve-worker', 'serve-agent', 'store-publish']
const BFF_ROUTES = ['dashboard', 'verify', 'reports', 'agents', 'billing', 'usage', 'webhooks', 'settings', 'keys', 'health']

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })

function filesFor(key) {
  const o = []
  if (key === 'tenancy') o.push(
    f('tenant.ts', 'Tenant entity + id'), f('tenant-context.ts', 'AsyncLocalStorage tenant context'),
    f('tenant-resolver.ts', 'resolve tenant from principal/host/header'), f('tenant-store.ts', 'tenant repository interface + memory'),
    f('isolation.ts', 'scope queries to tenant'), f('tenant-guard.ts', 'assert tenant access'),
    f('cross-tenant-error.ts', 'error'), f('plan-limits.ts', 'per-tenant limits'),
    f('provisioning.ts', 'provision/deprovision tenant'), f('settings.ts', 'tenant settings'),
    f('middleware.ts', 'express tenant middleware'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'rbac') {
    o.push(f('role.ts', 'Role + built-in roles'), f('permission.ts', 'Permission strings + parsing'),
      f('policy.ts', 'Policy (allow/deny rules)'), f('enforcer.ts', 'evaluate policies'),
      f('permission-matrix.ts', 'role->permissions matrix'), f('scopes.ts', 'scope expansion'),
      f('decorators.ts', 'requirePermission helpers'), f('subject.ts', 'authz subject'),
      f('resource.ts', 'resource descriptor'), f('grant.ts', 'grant/revoke'),
      f('role-store.ts', 'role repo interface+memory'), f('errors.ts', 'authz errors'),
      f('audit.ts', 'authz audit hook'), f('middleware.ts', 'express rbac middleware'), f('index.ts', 're-export'))
    for (const r of ['report', 'order', 'agent', 'billing', 'admin']) o.push(f(`resources/${r}.permissions.ts`, `${cap(r)} permission set`))
  } else if (key === 'eventsourcing') {
    o.push(f('domain-event.ts', 'event base + envelope'), f('aggregate-root.ts', 'AggregateRoot base'),
      f('event-store.ts', 'EventStore interface'), f('memory-event-store.ts', 'in-memory event store'),
      f('event-stream.ts', 'stream type'), f('snapshot.ts', 'snapshot store + policy'),
      f('projection.ts', 'Projection interface'), f('projection-engine.ts', 'run projections'),
      f('event-bus.ts', 'publish committed events'), f('repository.ts', 'event-sourced repo base'),
      f('serializer.ts', 'event (de)serialization'), f('versioning.ts', 'event upcasting'),
      f('errors.ts', 'concurrency/version errors'), f('index.ts', 're-export'))
    for (const a of AGGREGATES) {
      o.push(f(`aggregates/${a}.aggregate.ts`, `${cap(a)} aggregate`), f(`aggregates/${a}.events.ts`, `${cap(a)} domain events`))
    }
  } else if (key === 'messaging') o.push(
    f('message.ts', 'Message envelope'), f('message-bus.ts', 'bus interface'), f('in-memory-bus.ts', 'memory bus'),
    f('publisher.ts', 'publisher'), f('subscriber.ts', 'subscriber registry'), f('handler.ts', 'MessageHandler interface'),
    f('outbox.ts', 'transactional outbox'), f('inbox.ts', 'idempotent inbox'), f('dead-letter.ts', 'DLQ'),
    f('retry.ts', 'retry policy'), f('serializer.ts', 'serialize messages'), f('topic.ts', 'topic routing'),
    f('middleware.ts', 'bus middleware pipeline'), f('transports/memory.ts', 'memory transport'),
    f('transports/transport.ts', 'transport interface'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'cache') o.push(
    f('cache.ts', 'Cache interface'), f('memory-cache.ts', 'LRU memory cache'), f('ttl.ts', 'ttl helpers'),
    f('key.ts', 'cache key builder'), f('namespaced-cache.ts', 'prefix wrapper'), f('cache-aside.ts', 'cache-aside helper'),
    f('memoize.ts', 'async memoize'), f('decorator.ts', 'cached() wrapper'), f('stampede.ts', 'single-flight'),
    f('serializer.ts', 'value serialization'), f('stats.ts', 'hit/miss stats'), f('multi-tier.ts', 'tiered cache'),
    f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'ratelimit') o.push(
    f('limiter.ts', 'RateLimiter interface'), f('token-bucket.ts', 'token bucket'), f('sliding-window.ts', 'sliding window log'),
    f('fixed-window.ts', 'fixed window counter'), f('leaky-bucket.ts', 'leaky bucket'), f('store.ts', 'limiter store via cache'),
    f('policy.ts', 'per-route/plan policies'), f('key.ts', 'rate key derivation'), f('result.ts', 'limit decision'),
    f('headers.ts', 'ratelimit response headers'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'flags') o.push(
    f('flag.ts', 'FeatureFlag type'), f('provider.ts', 'FlagProvider interface'), f('memory-provider.ts', 'memory provider'),
    f('evaluator.ts', 'evaluate flags for context'), f('rules.ts', 'targeting rules'), f('rollout.ts', 'percentage rollout'),
    f('context.ts', 'evaluation context'), f('client.ts', 'flags client'), f('overrides.ts', 'per-tenant overrides'),
    f('registry.ts', 'flag registry'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'i18n') o.push(
    f('locale.ts', 'Locale type'), f('catalog.ts', 'message catalog'), f('translator.ts', 'translate + interpolate'),
    f('plural.ts', 'pluralization'), f('formatter.ts', 'number/date format'), f('negotiator.ts', 'accept-language negotiate'),
    f('loader.ts', 'catalog loader'), f('messages/en.ts', 'english messages'), f('messages/keys.ts', 'message keys'),
    f('context.ts', 'i18n context'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'crypto') o.push(
    f('hash.ts', 'sha256/512 helpers'), f('hmac.ts', 'hmac sign/verify'), f('random.ts', 'secure random/base62'),
    f('signer.ts', 'Signer interface'), f('ed25519.ts', 'ed25519 sign/verify wrapper'), f('kms.ts', 'KMS port'),
    f('local-kms.ts', 'local in-memory KMS'), f('encryption.ts', 'aes-gcm encrypt/decrypt'), f('key.ts', 'key material types'),
    f('key-rotation.ts', 'rotation policy'), f('jwt.ts', 'minimal JWS sign/verify'), f('base64url.ts', 'base64url codec'),
    f('constant-time.ts', 'constant-time compare'), f('fingerprint.ts', 'key fingerprint'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'blockchain') o.push(
    f('chain.ts', 'Chain config (Base mainnet/sepolia)'), f('address.ts', 'EVM address value object'), f('units.ts', 'wei/usdc unit math'),
    f('hex.ts', 'hex helpers'), f('provider.ts', 'JSON-RPC provider interface'), f('http-provider.ts', 'fetch JSON-RPC provider'),
    f('rpc.ts', 'rpc method wrappers'), f('block.ts', 'block types'), f('transaction.ts', 'tx types'),
    f('receipt.ts', 'receipt types'), f('tx-watcher.ts', 'watch tx confirmations'), f('wallet.ts', 'wallet/account abstraction view'),
    f('abi/erc20.ts', 'ERC20 abi fragments'), f('abi/encode.ts', 'minimal abi encode/decode'), f('contracts/usdc.ts', 'USDC contract reader'),
    f('contracts/escrow.ts', 'CAP escrow reader interface'), f('balance.ts', 'erc20 balanceOf'), f('gas.ts', 'gas estimate helpers'),
    f('explorer.ts', 'basescan url builders'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'search') o.push(
    f('index-port.ts', 'SearchIndex interface'), f('memory-index.ts', 'in-memory inverted index'), f('document.ts', 'indexed doc'),
    f('tokenizer.ts', 'tokenizer'), f('query.ts', 'query parser'), f('ranking.ts', 'bm25-lite ranking'),
    f('report-indexer.ts', 'index verification reports'), f('analyzer.ts', 'text analyzer'), f('highlight.ts', 'snippet highlight'),
    f('facets.ts', 'facet aggregation'), f('paginate.ts', 'result pagination'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'analytics') o.push(
    f('event.ts', 'analytics event'), f('tracker.ts', 'tracker interface+impl'), f('aggregator.ts', 'time-bucket aggregation'),
    f('metrics.ts', 'derived KPIs'), f('rollup.ts', 'daily/monthly rollups'), f('report.ts', 'analytics report types'),
    f('dashboard.ts', 'dashboard data assembler'), f('funnel.ts', 'funnel analysis'), f('retention.ts', 'retention cohort'),
    f('usage-stats.ts', 'verification usage stats'), f('trust-trends.ts', 'trust-score trends'), f('store.ts', 'analytics store'),
    f('query.ts', 'analytics query'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'scheduler') o.push(
    f('cron.ts', 'cron expression parser'), f('schedule.ts', 'Schedule type'), f('scheduler.ts', 'Scheduler interface+impl'),
    f('job.ts', 'scheduled job'), f('trigger.ts', 'trigger types'), f('clock.ts', 'tickable clock'),
    f('registry.ts', 'job registry'), f('runner.ts', 'run due jobs'), f('lock.ts', 'distributed lock port'),
    f('backoff.ts', 'retry backoff'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'email') o.push(
    f('email.ts', 'Email message type'), f('transport.ts', 'EmailTransport interface'), f('console-transport.ts', 'log transport'),
    f('smtp-transport.ts', 'smtp transport interface'), f('renderer.ts', 'template renderer'), f('template.ts', 'template type'),
    f('templates/verification-complete.ts', 'tmpl'), f('templates/invoice.ts', 'tmpl'), f('templates/welcome.ts', 'tmpl'),
    f('address.ts', 'email address parse'), f('sender.ts', 'email sender service'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  else if (key === 'storage') o.push(
    f('storage.ts', 'ObjectStorage interface'), f('memory-storage.ts', 'memory storage'), f('local-storage.ts', 'fs storage'),
    f('s3-storage.ts', 's3-compatible interface'), f('object.ts', 'stored object meta'), f('key.ts', 'object key builder'),
    f('signed-url.ts', 'presigned url interface'), f('stream.ts', 'stream helpers'), f('content-type.ts', 'mime helpers'),
    f('report-store.ts', 'persist reports as artifacts'), f('lifecycle.ts', 'retention lifecycle'), f('errors.ts', 'errors'),
    f('multipart.ts', 'multipart upload interface'), f('index.ts', 're-export'))
  else if (key === 'migrations') {
    o.push(f('migration.ts', 'Migration interface'), f('runner.ts', 'migration runner (up/down)'), f('registry.ts', 'ordered migration registry'),
      f('state-store.ts', 'applied-migrations store'), f('lock.ts', 'migration lock'), f('plan.ts', 'compute pending plan'), f('index.ts', 're-export'))
    const tables = ['organizations', 'users', 'memberships', 'api-keys', 'agents', 'services', 'orders', 'negotiations', 'deliveries', 'wallets', 'usage', 'invoices', 'plans', 'subscriptions', 'webhooks', 'audit-logs', 'sessions', 'settlements', 'transactions']
    tables.forEach((t, i) => o.push(f(`migrations/${String(i + 1).padStart(4, '0')}-create-${t}.ts`, `create ${t} schema descriptor`)))
  } else if (key === 'gatewaycore') o.push(
    f('route.ts', 'gateway route descriptor'), f('router.ts', 'route matcher'), f('proxy.ts', 'upstream proxy interface'),
    f('upstream.ts', 'upstream registry'), f('circuit-breaker.ts', 'circuit breaker'), f('retry.ts', 'gateway retry'),
    f('aggregator.ts', 'response aggregation'), f('transform.ts', 'request/response transform'), f('auth-filter.ts', 'auth filter'),
    f('rate-filter.ts', 'rate-limit filter'), f('cors.ts', 'cors policy'), f('headers.ts', 'header policy'),
    f('errors.ts', 'errors'), f('index.ts', 're-export'))
  // ---- apps ----
  else if (key === 'admin') {
    o.push(f('main.ts', 'admin-api entrypoint'), f('app.ts', 'build admin express app'), f('router.ts', 'mount admin routers'),
      f('middleware/admin-auth.ts', 'admin auth (rbac)'), f('middleware/tenant.ts', 'tenant scoping'),
      f('middleware/audit.ts', 'audit every mutation'), f('middleware/error-handler.ts', 'errors'),
      f('middleware/pagination.ts', 'pagination'), f('http/responder.ts', 'envelope'), f('http/api-error.ts', 'http error'),
      f('openapi.ts', 'admin openapi'), f('index.ts', 're-export'))
    for (const r of ADMIN_RES) o.push(
      f(`routes/${r}.routes.ts`, `${cap(r)} admin routes`), f(`controllers/${r}.controller.ts`, `${cap(r)} admin controller`), f(`validators/${r}.validator.ts`, `${cap(r)} validators`))
  } else if (key === 'graphql') {
    o.push(f('main.ts', 'graphql server entrypoint'), f('server.ts', 'http graphql server'), f('schema.ts', 'assemble schema'),
      f('execute.ts', 'minimal execute over resolver map'), f('context.ts', 'gql context (principal, loaders)'),
      f('scalars.ts', 'custom scalars (DateTime, JSON, Money)'), f('dataloader.ts', 'tiny dataloader'),
      f('errors.ts', 'gql errors'), f('pagination.ts', 'relay-style connections'), f('directives.ts', 'auth directive'),
      f('root.ts', 'Query/Mutation root wiring'), f('index.ts', 're-export'))
    for (const e of GQL_ENTITIES) o.push(
      f(`types/${e}.type.ts`, `${cap(e)} GraphQL type`), f(`resolvers/${e}.resolver.ts`, `${cap(e)} resolvers`), f(`loaders/${e}.loader.ts`, `${cap(e)} dataloader`))
  } else if (key === 'cli') {
    o.push(f('main.ts', 'cli entrypoint'), f('cli.ts', 'arg parse + dispatch'), f('command.ts', 'Command interface'),
      f('registry.ts', 'command registry'), f('output.ts', 'table/json output'), f('config.ts', 'cli config/env'),
      f('spinner.ts', 'progress indicator'), f('errors.ts', 'cli errors'), f('help.ts', 'help text'), f('index.ts', 're-export'))
    for (const c of CLI_CMDS) o.push(f(`commands/${c}.command.ts`, `${cap(c)} command`))
  } else if (key === 'schedulerapp') o.push(
    f('main.ts', 'scheduler app entrypoint'), f('bootstrap.ts', 'wire scheduler + jobs'), f('jobs/expire-orders.job.ts', 'job'),
    f('jobs/rollup-usage.job.ts', 'job'), f('jobs/reconcile-settlements.job.ts', 'job'), f('jobs/retry-webhooks.job.ts', 'job'),
    f('jobs/generate-invoices.job.ts', 'job'), f('jobs/prune-audit.job.ts', 'job'), f('schedule-table.ts', 'cron table'), f('index.ts', 're-export'))
  else if (key === 'bff') {
    o.push(f('main.ts', 'bff entrypoint'), f('app.ts', 'build bff app'), f('router.ts', 'mount bff routes'),
      f('session.ts', 'bff session handling'), f('upstream.ts', 'veritas api upstream client'), f('middleware/auth.ts', 'auth'),
      f('middleware/error.ts', 'errors'), f('view-model.ts', 'shape responses for UI'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
    for (const r of BFF_ROUTES) o.push(f(`routes/${r}.routes.ts`, `${cap(r)} BFF route`))
  }
  return o
}

function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }
const units = []
let totalFiles = 0
for (const pkg of ALL) {
  const files = filesFor(pkg.key)
  totalFiles += files.length
  const groups = chunk(files, 5)
  groups.forEach((g, i) => units.push({ pkg, allFiles: files, assigned: g, idx: i, groups: groups.length }))
}

const EXPORTS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: { core: { type: 'array', items: { type: 'string' } }, contracts: { type: 'array', items: { type: 'string' } } },
  required: ['core', 'contracts'],
}
const TSC_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    errorCount: { type: 'number' },
    topFiles: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { file: { type: 'string' }, errors: { type: 'number' }, sample: { type: 'string' } }, required: ['file', 'errors', 'sample'] } },
  }, required: ['errorCount', 'topFiles'],
}

// ===== Scaffold (merge into existing root configs) =====
phase('Scaffold')
const pkgList = JSON.stringify(ALL.map((p) => ({ name: p.name, dir: p.dir })))
await agent([
  ARCH, '',
  'Update the EXISTING monorepo root configs at ' + BASE + ' to register these NEW packages/apps, then create each one\'s package.json.',
  'NEW (name, dir): ' + pkgList,
  '',
  '1) Read ' + BASE + '/tsconfig.json. For EACH new package add to compilerOptions.paths:',
  '   "@veritas/<short>": ["<dir>/src/index.ts"] and "@veritas/<short>/*": ["<dir>/src/*"]  (short = name minus "@veritas/").',
  '   Keep all existing paths. Save the file (valid JSON).',
  '2) Read ' + BASE + '/package.json and ADD these dependencies if missing, then save (valid JSON, keep existing fields/deps):',
  '   add scripts: "admin":"tsx apps/admin-api/src/main.ts","graphql":"tsx apps/graphql/src/main.ts","cli":"tsx apps/cli/src/main.ts","scheduler":"tsx apps/scheduler-app/src/main.ts","bff":"tsx apps/bff/src/main.ts".',
  '3) For EACH new package/app create <dir>/package.json = {"name","version":"1.0.0","type":"module","main":"src/index.ts","types":"src/index.ts"}.',
  'Reply only {"written":N}.',
].join('\n'), { label: 'scaffold-merge', phase: 'Scaffold', effort: 'high' })
log('scaffold merge complete')

// ===== Discover existing foundation exports =====
phase('Discover')
const disc = await agent([
  'Read ' + BASE + '/packages/core/src/index.ts and ' + BASE + '/packages/contracts/src/index.ts (follow obvious re-exports one level if helpful).',
  'Return the list of exported identifier names from each (types, classes, functions, schemas). Do not write files.',
].join('\n'), { label: 'discover-exports', phase: 'Discover', schema: EXPORTS_SCHEMA, effort: 'low' })
const CHEAT = [
  'SHARED FOUNDATION (already implemented — import, do not redefine):',
  '@veritas/core exports: ' + ((disc && disc.core) || []).join(', '),
  '@veritas/contracts exports: ' + ((disc && disc.contracts) || []).join(', '),
  'Cross-package import alias is @veritas/<pkg>; within-package imports are relative with .js.',
].join('\n')

// ===== Implement =====
phase('Implement')
log(`fanning out ${units.length} units covering ${totalFiles} new files across ${ALL.length} modules`)
function implPrompt(u) {
  const fileList = u.allFiles.map((x) => `  - src/${x.p} : ${x.d}`).join('\n')
  const assigned = u.assigned.map((x) => `${BASE}/${u.pkg.dir}/src/${x.p}`).join('\n')
  const depAliases = (u.pkg.deps || []).map((d) => '@veritas/' + d).join(', ')
  return [
    ARCH, '', CHEAT, '',
    `You implement part of ${u.pkg.name} (dir ${u.pkg.dir}). It may import from: ${depAliases || '(core/contracts only)'}.`,
    'FULL file list of this module (for sibling imports via ./paths .js):',
    fileList, '',
    'WRITE ONLY these files (exact absolute paths), fully implemented, strict-TS-clean:',
    assigned, '',
    'If you write src/index.ts, re-export the module public surface. Reply only {"written":N}.',
  ].join('\n')
}
const impl = await parallel(units.map((u) => () => agent(implPrompt(u), {
  label: `impl:${u.pkg.key}/${u.idx + 1}of${u.groups}`, phase: 'Implement', model: 'sonnet', effort: 'medium',
})))
const implDone = impl.filter(Boolean).length
log(`implementation finished: ${implDone}/${units.length}`)

// ===== Integrate =====
phase('Integrate')
await agent('At ' + BASE + ': run `cd ' + BASE + ' && ([ -d node_modules/typescript ] && echo "deps already present, skipping install" || npm install)` (up to 10 min). This is idempotent — do NOT force a reinstall if node_modules/typescript already exists (another build may be installing concurrently). Report outcome in one line. Do not edit source.', { label: 'install', phase: 'Integrate', effort: 'low' })
const tscPrompt = [
  'Typecheck at ' + BASE + '. Run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 | tee /tmp/vx-tsc.txt | tail -3`; count with `grep -c "error TS" /tmp/vx-tsc.txt`;',
  'worst files via `grep -oE "^[^(]+\\.ts" /tmp/vx-tsc.txt | sort | uniq -c | sort -rn | head -30`.',
  'Return errorCount and topFiles (file, count, one sample error line). Do not edit files.',
].join('\n')
const tsc1 = await agent(tscPrompt, { label: 'typecheck', phase: 'Integrate', schema: TSC_SCHEMA, effort: 'low' })
log(`typecheck after implement: ${tsc1 ? tsc1.errorCount : '?'} errors`)

// ===== Fix =====
phase('Fix')
let lastErrors = tsc1 ? tsc1.errorCount : 0
if (tsc1 && tsc1.errorCount > 0) {
  const targets = (tsc1.topFiles || []).slice(0, 30)
  await parallel(targets.map((t) => () => agent([
    ARCH, '', CHEAT, '',
    `Fix TypeScript errors in ${BASE}/${t.file} (only that file). ~${t.errors} errors. Sample: ${t.sample}`,
    'Read it, run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 | grep "' + t.file + '"`, then Edit ONLY that file to clear those errors (fix imports alias-vs-relative-.js, add local exports, type mismatches). No `any` unless unavoidable. Reply only {"fixed":true}.',
  ].join('\n'), { label: `fix:${t.file.split('/').pop()}`, phase: 'Fix', model: 'sonnet', effort: 'medium' })))
  const tsc2 = await agent(tscPrompt, { label: 'typecheck-2', phase: 'Fix', schema: TSC_SCHEMA, effort: 'low' })
  lastErrors = tsc2 ? tsc2.errorCount : lastErrors
  log(`typecheck after fix: ${lastErrors} errors`)
}

return { newModules: ALL.length, unitsDispatched: units.length, filesPlanned: totalFiles, implAgentsCompleted: implDone, tscErrorsInitial: tsc1 ? tsc1.errorCount : null, tscErrorsFinal: lastErrors }
