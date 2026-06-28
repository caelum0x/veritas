export const meta = {
  name: 'veritas-apps-prod',
  description: 'Productionize all apps: deep DI wiring of packages, app-service layer, feature modules, full middleware (~700 files)',
  phases: [
    { title: 'Implement', detail: 'per-app core + feature units that wire packages' },
    { title: 'Integrate', detail: 'typecheck' },
    { title: 'Fix', detail: 'per-module repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const WAVE = 'wapps'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification platform. ~3,250 TS files, ~217 packages/apps. The DOMAIN LOGIC lives in @veritas/<pkg> packages.',
  'GOAL: turn a thin MVP app into a PRODUCTION app that FULLY USES the packages. No demos, no tests, no stubs, no placeholder handlers.',
  'GLOBAL RULES:',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__. NEVER write demo/seed/sample data.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-app imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code. Files < ~160 lines, one-line purpose comment.',
  '- zod for request/response validation and config. Result<T> from @veritas/core for fallible ops. Immutable data.',
  '- CRITICAL: this app must actually CALL the packages. Before importing from a dependency package, READ its src/index.ts (' + BASE + '/packages/<pkg>/src/index.ts) to learn the EXACT exports (services, flows, repositories, factory functions). Wire those into the app — do not reimplement domain logic in the app.',
  '',
  'ARCHITECTURE CONVENTION (all agents on the same app follow this so the pieces fit):',
  '- config.ts: zod-validated AppConfig + loadConfig().',
  '- container.ts: builds a Deps object — instantiates the in-memory repositories, services, flows, and providers from the integrated packages, plus logger/clock. Export `type Deps` and `buildContainer(config): Deps`.',
  '- Each feature module lives under features/<feature>/ and exports `register<Pascal>Routes(router, deps)` (HTTP apps) or `register<Pascal>Handlers(dispatcher, deps)` (worker apps). The feature SERVICE (features/<feature>/<feature>.service.ts) calls the package flows/services via deps.',
  '- router.ts (HTTP): imports every feature\'s register fn and mounts it. worker dispatcher.ts: registers every handler.',
  '- app.ts (HTTP): builds the express app, applies the middleware stack, mounts router, error handler. main.ts: loadConfig -> buildContainer -> start server/worker -> graceful shutdown.',
  '- Use @veritas/observability for logging/metrics, @veritas/auth for auth middleware where relevant.',
  '- Do NOT edit root tsconfig.json/package.json. Do NOT run npm/tsc/git. ONLY Write your assigned files (overwrite thin existing ones with production versions). Never write files outside your app dir or outside your assigned list.',
  'OUTPUT: after writing, reply ONLY {"written":N}.',
].join('\n')

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')

// app descriptors: kind http|worker|process, integrates packages, features
const APPS = [
  { key: 'api', kind: 'http', integ: ['contracts', 'services', 'persistence', 'verification', 'flows-verification', 'flows-commerce', 'billing', 'webhooks', 'auth', 'rate-limit', 'idempotency', 'observability', 'container'], features: ['verification-jobs', 'reports', 'orders', 'agents', 'wallets', 'usage', 'webhooks'] },
  { key: 'admin-api', kind: 'http', integ: ['contracts', 'services', 'persistence', 'rbac', 'tenancy', 'auth', 'audit-export', 'observability'], features: ['tenants', 'users', 'roles', 'plans', 'agents', 'audit-logs'] },
  { key: 'public-api', kind: 'http', integ: ['contracts', 'services', 'verification', 'flows-verification', 'pricing-engine', 'usage-billing', 'auth', 'rate-limit', 'observability'], features: ['verification', 'reports', 'usage', 'pricing'] },
  { key: 'billing-api', kind: 'http', integ: ['contracts', 'billing', 'usage-billing', 'tax', 'dunning', 'payments', 'revenue', 'flows-commerce', 'auth', 'observability'], features: ['subscriptions', 'invoices', 'usage', 'payments', 'tax'] },
  { key: 'growth-api', kind: 'http', integ: ['contracts', 'referrals', 'credits', 'coupons', 'trials', 'onboarding', 'campaigns', 'flows-lifecycle', 'auth', 'observability'], features: ['referrals', 'credits', 'coupons', 'trials', 'onboarding'] },
  { key: 'analytics-api', kind: 'http', integ: ['contracts', 'query-engine', 'reporting', 'dashboards', 'analytics', 'warehouse', 'flows-data', 'auth', 'observability'], features: ['queries', 'reports', 'dashboards', 'metrics'] },
  { key: 'auth-server', kind: 'http', integ: ['contracts', 'auth', 'sso', 'mfa', 'secrets', 'observability'], features: ['login', 'sso', 'mfa', 'sessions'] },
  { key: 'privacy-api', kind: 'http', integ: ['contracts', 'gdpr', 'consent', 'retention', 'dlp', 'flows-compliance', 'auth', 'observability'], features: ['dsr', 'consent', 'retention'] },
  { key: 'ops-api', kind: 'http', integ: ['contracts', 'incident', 'slo', 'cost', 'capacity', 'health-aggregation', 'auth', 'observability'], features: ['incidents', 'slo', 'cost', 'capacity'] },
  { key: 'developer-portal-api', kind: 'http', integ: ['contracts', 'developer-portal', 'partner', 'api-analytics', 'auth', 'observability'], features: ['apps', 'keys', 'usage', 'partners'] },
  { key: 'webhook-gateway', kind: 'http', integ: ['contracts', 'webhooks', 'event-wiring', 'crypto', 'auth', 'observability'], features: ['inbound', 'subscriptions', 'deliveries'] },
  { key: 'agent-gateway', kind: 'http', integ: ['contracts', 'a2a-protocol', 'agent-card', 'verification', 'cap', 'observability'], features: ['a2a', 'agent-card', 'tasks'] },
  { key: 'mock-api-server', kind: 'http', integ: ['contracts', 'mock-server'], features: ['mocks'] },
  { key: 'status-page', kind: 'http', integ: ['health-aggregation', 'slo', 'incident', 'observability'], features: ['status', 'incidents', 'uptime'] },
  { key: 'domain-router', kind: 'http', integ: ['contracts', 'taxonomy', 'verifier-kit', 'verification', 'observability'], features: ['routing', 'verifiers'] },
  { key: 'bff', kind: 'http', integ: ['contracts', 'gateway-core', 'sdk', 'auth', 'observability'], features: ['dashboard', 'verify', 'reports', 'billing'] },
  { key: 'mcp-server-app', kind: 'process', integ: ['mcp-server', 'verification', 'flows-verification', 'function-tools', 'guardrails', 'observability'], features: ['verify', 'reports', 'tools'] },
  { key: 'cap-agent', kind: 'process', integ: ['cap', 'verification', 'flows-verification', 'flows-commerce', 'llm', 'container', 'observability'], features: ['negotiation', 'verification', 'settlement'] },
  { key: 'plugin-host', kind: 'process', integ: ['plugin-sdk', 'verification', 'observability'], features: ['plugins', 'dispatch'] },
  { key: 'attestation-publisher', kind: 'process', integ: ['attestation', 'merkle', 'verification', 'scheduler', 'observability'], features: ['anchoring', 'publishing'] },
  { key: 'metrics-exporter', kind: 'process', integ: ['otel', 'observability', 'health-aggregation'], features: ['collection', 'exposition'] },
  { key: 'quality-monitor', kind: 'process', integ: ['quality-gates', 'analytics', 'observability'], features: ['monitoring', 'alerts'] },
  { key: 'worker', kind: 'worker', integ: ['contracts', 'services', 'flows-commerce', 'flows-data', 'queue-advanced', 'messaging', 'scheduler', 'observability'], features: ['run-verification', 'deliver-webhook', 'generate-invoice', 'reconcile-settlements', 'aggregate-usage'] },
  { key: 'ingestion-worker', kind: 'worker', integ: ['ingestion', 'flows-verification', 'verification', 'queue-advanced', 'observability'], features: ['ingest', 'extract', 'verify'] },
  { key: 'reporting-worker', kind: 'worker', integ: ['reporting', 'query-engine', 'flows-data', 'scheduler', 'observability'], features: ['generate-report', 'deliver-report'] },
  { key: 'scheduler-app', kind: 'worker', integ: ['scheduler', 'services', 'flows-commerce', 'observability'], features: ['expire-orders', 'rollup-usage', 'retry-webhooks', 'reconcile'] },
  { key: 'agent-orchestrator', kind: 'worker', integ: ['cap', 'verification', 'sagas', 'orchestration', 'a2a-protocol', 'observability'], features: ['fan-out', 'consensus', 'escalate'] },
]

function rootFiles(kind) {
  const common = ['config.ts', 'container.ts', 'bootstrap.ts', 'main.ts', 'context.ts', 'errors.ts', 'health.ts', 'shutdown.ts', 'index.ts']
  if (kind === 'http') return [...common, 'app.ts', 'server.ts', 'router.ts', 'openapi.ts',
    'middleware/auth.ts', 'middleware/error-handler.ts', 'middleware/rate-limit.ts', 'middleware/idempotency.ts', 'middleware/validate.ts',
    'middleware/request-id.ts', 'middleware/logging.ts', 'middleware/metrics.ts', 'middleware/security-headers.ts', 'middleware/not-found.ts', 'middleware/pagination.ts',
    'http/responder.ts', 'http/api-error.ts', 'http/async-handler.ts', 'http/problem.ts']
  if (kind === 'worker') return [...common, 'worker.ts', 'runtime.ts', 'queue.ts', 'dispatcher.ts', 'scheduler-wiring.ts']
  return [...common, 'runtime.ts', 'supervisor.ts'] // process
}
function featureFiles(kind, fpath) {
  if (kind === 'http') return ['service', 'controller', 'routes', 'schema', 'mapper'].map((s) => `features/${fpath}/${fpath}.${s}.ts`)
  if (kind === 'worker') return [`handlers/${fpath}.handler.ts`, `services/${fpath}.service.ts`]
  return [`features/${fpath}/${fpath}.handler.ts`, `features/${fpath}/${fpath}.service.ts`]
}

function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }

// Build units: one CORE unit per app + feature units (2 features each)
const units = []
let totalFiles = 0
for (const app of APPS) {
  const dir = 'apps/' + app.key
  const root = rootFiles(app.kind)
  const allFeatureFiles = app.features.flatMap((fp) => featureFiles(app.kind, fp))
  const allFiles = [...root, ...allFeatureFiles]
  totalFiles += allFiles.length
  // core unit
  units.push({ app, dir, role: 'core', files: root, allFiles, idx: 0 })
  // feature units (2 features per unit)
  chunk(app.features, 2).forEach((fgroup, i) => {
    const files = fgroup.flatMap((fp) => featureFiles(app.kind, fp))
    units.push({ app, dir, role: 'features', features: fgroup, files, allFiles, idx: i + 1 })
  })
}

const TSC_SCHEMA = { type: 'object', additionalProperties: false, properties: { errorCount: { type: 'number' }, topModules: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { module: { type: 'string' }, errors: { type: 'number' } }, required: ['module', 'errors'] } } }, required: ['errorCount', 'topModules'] }

phase('Implement')
log(`productionizing ${APPS.length} apps via ${units.length} units (~${totalFiles} files)`)

function unitPrompt(u) {
  const integ = u.app.integ.map((p) => `@veritas/${p}`).join(', ')
  const fullList = u.allFiles.map((x) => '  - src/' + x).join('\n')
  const assigned = u.files.map((x) => `${BASE}/${u.dir}/src/${x}`).join('\n')
  const featureRegisters = u.app.features.map((fp) => {
    const reg = u.app.kind === 'worker' ? `register${cap(fp)}Handlers(dispatcher, deps)` : `register${cap(fp)}Routes(router, deps)`
    const path = u.app.kind === 'worker' ? `./handlers/${fp}.handler.js` : `./features/${fp}/${fp}.routes.js`
    return `    ${reg}  (from ${path})`
  }).join('\n')
  const roleNote = u.role === 'core'
    ? [
      'YOUR ROLE: the COMPOSITION CORE of this app. Write config.ts, container.ts (buildContainer wiring the integrated packages into a Deps object), the middleware/http stack, app.ts/server.ts/main.ts/router.ts (or worker.ts/dispatcher.ts/runtime.ts/supervisor.ts), health.ts, shutdown.ts, errors.ts, context.ts, index.ts.',
      'router.ts / dispatcher.ts MUST import and call each feature register fn (the feature files are written by other agents — import them by the exact paths below):',
      featureRegisters,
      'container.ts MUST instantiate the real package services/flows/repositories from: ' + integ + ' (read each package index.ts for exact exports).',
    ].join('\n')
    : [
      `YOUR ROLE: implement feature modules for: ${u.features.join(', ')}.`,
      'Each feature exports its register fn with the EXACT name/signature the core router expects:',
      u.features.map((fp) => u.app.kind === 'worker' ? `  export function register${cap(fp)}Handlers(dispatcher, deps): void` : `  export function register${cap(fp)}Routes(router, deps): void`).join('\n'),
      'The feature SERVICE must call the package flows/services via `deps` (the Deps type from ../../container.js) — implement REAL behavior using: ' + integ + '. Read those packages\' index.ts for exact exports. Controllers validate with zod schema, call the service, map results to HTTP/job responses.',
    ].join('\n')

  return [ARCH, '', `APP: @veritas/${u.app.key} (${u.dir}), kind=${u.app.kind}. Integrates: ${integ}.`, '',
    'FULL intended file layout of this app (so you import siblings by the right relative ./paths with .js):',
    fullList, '', roleNote, '',
    'WRITE ONLY these files (exact absolute paths), production-grade, fully wired to the packages, no stubs:',
    assigned, '', 'Reply only {"written":N}.'].join('\n')
}

const impl = await parallel(units.map((u) => () => agent(unitPrompt(u), { label: `app:${u.app.key}/${u.role}${u.idx}`, phase: 'Implement', model: 'sonnet', effort: 'high' })))
log(`app units finished: ${impl.filter(Boolean).length}/${units.length}`)

phase('Integrate')
const tscPrompt = [
  'Typecheck at ' + BASE + '. Run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 > /tmp/vtsc-' + WAVE + '.txt; grep -c "error TS" /tmp/vtsc-' + WAVE + '.txt`;',
  'per-module: `grep -oE "^(packages|apps|examples)/[^/]+" /tmp/vtsc-' + WAVE + '.txt | sort | uniq -c | sort -rn | head -60`;',
  'regenerate fix files: `rm -rf /tmp/fix-' + WAVE + ' && mkdir -p /tmp/fix-' + WAVE + ' && grep "error TS" /tmp/vtsc-' + WAVE + '.txt | while IFS= read -r l; do m=$(echo "$l" | grep -oE "^(packages|apps|examples)/[^/]+"); [ -z "$m" ] && continue; s=$(echo "$m" | tr "/" "_"); echo "$l" >> /tmp/fix-' + WAVE + '/$s.txt; done`.',
  'Return errorCount and topModules. Do not edit files.',
].join('\n')
const tsc1 = await agent(tscPrompt, { label: 'typecheck', phase: 'Integrate', schema: TSC_SCHEMA, effort: 'low' })
log(`typecheck after implement: ${tsc1 ? tsc1.errorCount : '?'} errors`)

phase('Fix')
let last = tsc1 ? tsc1.errorCount : 0
if (tsc1 && tsc1.errorCount > 0) {
  const targets = (tsc1.topModules || []).filter((m) => m.errors > 0).slice(0, 30)
  await parallel(targets.map((t) => () => {
    const safe = t.module.replace('/', '_')
    return agent([ARCH, '', 'Repair strict TypeScript errors in module ' + BASE + '/' + t.module + ' (ONLY this module\'s files).',
      'Read /tmp/fix-' + WAVE + '/' + safe + '.txt for this module\'s tsc errors. Fix every listed error properly. For "no exported member" against another @veritas/* pkg, Read that pkg\'s src/index.ts and fix YOUR import name; keep the app wired to the real package APIs; never edit other modules. No `any` unless unavoidable. Reply only {"fixed":true}.',
    ].join('\n'), { label: `fix:${t.module}`, phase: 'Fix', model: 'sonnet', effort: 'high' })
  }))
  const tsc2 = await agent(tscPrompt, { label: 'typecheck-2', phase: 'Fix', schema: TSC_SCHEMA, effort: 'low' })
  last = tsc2 ? tsc2.errorCount : last
  log(`typecheck after fix: ${last} errors`)
}

return { apps: APPS.length, unitsDispatched: units.length, filesPlanned: totalFiles, implCompleted: impl.filter(Boolean).length, tscErrorsInitial: tsc1 ? tsc1.errorCount : null, tscErrorsFinal: last }
