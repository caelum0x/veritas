export const meta = {
  name: 'veritas-wave11',
  description: 'Wave 11: integration & composition — end-to-end flows, DI wiring, event wiring, unified platform app (~230 files)',
  phases: [
    { title: 'Scaffold', detail: 'per-module package.json' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across integration modules' },
    { title: 'Integrate', detail: 'typecheck (own modules)' },
    { title: 'Fix', detail: 'own-module type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const WAVE = 'w11'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform with ~3,000 TS files across ~100 packages/apps.',
  'This is the INTEGRATION wave: wire the many domain packages together into end-to-end FLOWS and compose them into apps. Another build may run concurrently — only write your assigned files.',
  'GLOBAL RULES:',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs). Files < ~160 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data. Use Result<T> from @veritas/core for fallible flow steps.',
  '- CRITICAL: before importing from any @veritas/<pkg> dependency, READ that package\'s src/index.ts (' + BASE + '/<pkgdir>/src/index.ts) to confirm the EXACT exported names you import. Do not guess export names.',
  '- A "flow" is an application service that composes multiple packages into one end-to-end use case: it takes dependencies via its constructor/params (ports), runs ordered steps returning Result, and emits domain events. Keep flows framework-agnostic.',
  '- Use ONLY installed deps (zod, express, pino, nanoid). NO new npm deps.',
  '- Do NOT edit root tsconfig.json or root package.json. Do NOT run npm/tsc/git. ONLY Write assigned files; never edit files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}.',
].join('\n')

const PACKAGES = [
  { key: 'integration-context', dir: 'packages/integration-context', deps: ['core', 'observability', 'config'] },
  { key: 'flows-verification', dir: 'packages/flows-verification', deps: ['core', 'contracts', 'verification', 'llm', 'attestation', 'ingestion', 'knowledge', 'quality-gates', 'taxonomy', 'verifier-kit', 'observability'] },
  { key: 'flows-commerce', dir: 'packages/flows-commerce', deps: ['core', 'contracts', 'cap', 'billing', 'payments', 'usage-billing', 'dunning', 'webhooks', 'settlement', 'observability'] },
  { key: 'flows-marketplace', dir: 'packages/flows-marketplace', deps: ['core', 'contracts', 'marketplace', 'reputation', 'identity', 'registry-onchain', 'agent-store', 'observability'] },
  { key: 'flows-lifecycle', dir: 'packages/flows-lifecycle', deps: ['core', 'contracts', 'onboarding', 'trials', 'subscription', 'churn', 'lifecycle', 'credits', 'observability'] },
  { key: 'flows-compliance', dir: 'packages/flows-compliance', deps: ['core', 'contracts', 'gdpr', 'retention', 'consent', 'audit-export', 'soc2', 'dlp', 'observability'] },
  { key: 'flows-data', dir: 'packages/flows-data', deps: ['core', 'contracts', 'etl', 'warehouse', 'analytics', 'reporting', 'observability'] },
  { key: 'event-wiring', dir: 'packages/event-wiring', deps: ['core', 'messaging', 'cdc', 'webhooks', 'notifications', 'event-sourcing', 'observability'] },
  { key: 'orchestration', dir: 'packages/orchestration', deps: ['core', 'sagas', 'workflow-engine', 'observability'] },
  { key: 'wiring', dir: 'packages/wiring', deps: ['core', 'container', 'persistence', 'services', 'config', 'observability'] },
  { key: 'composition', dir: 'packages/composition', deps: ['core', 'observability', 'config', 'gateway-core'] },
  { key: 'health-wiring', dir: 'packages/health-wiring', deps: ['core', 'health-aggregation', 'observability'] },
]
const APPS = [
  { key: 'platform', dir: 'apps/platform', deps: ['core', 'config', 'observability', 'container', 'wiring', 'composition', 'event-wiring', 'health-wiring'] },
  { key: 'all-in-one', dir: 'apps/all-in-one', deps: ['core', 'config', 'observability', 'composition'] },
]
const ALL = [...PACKAGES, ...APPS]

const f = (p, d) => ({ p, d })

function filesFor(key) {
  if (key === 'integration-context') return [
    f('context.ts', 'integration runtime context (logger, clock, eventBus, config)'), f('ports.ts', 'shared port registry'),
    f('app-bus.ts', 'in-process application event bus'), f('flow.ts', 'Flow<Input,Output> interface + helpers'),
    f('step.ts', 'flow step helper with Result short-circuit'), f('result-pipe.ts', 'compose Result-returning steps'),
    f('dependencies.ts', 'common dependency bundle type'), f('errors.ts', 'integration errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'flows-verification') return [
    f('verify-claims.flow.ts', 'claims -> engine -> report'), f('verify-and-attest.flow.ts', 'verify -> attest on-chain -> provenance'),
    f('ingest-and-verify.flow.ts', 'ingest document -> extract -> verify -> report'), f('cached-verify.flow.ts', 'check knowledge cache then verify'),
    f('quality-gated-verify.flow.ts', 'verify -> run quality gates -> finalize'), f('domain-routed-verify.flow.ts', 'taxonomy -> specialized verifiers -> merge'),
    f('deps.ts', 'flow dependency bundle'), f('events.ts', 'verification flow events'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'flows-commerce') return [
    f('hire-and-settle.flow.ts', 'CAP order paid -> verify -> deliver -> settle -> meter'), f('subscribe-and-bill.flow.ts', 'subscription -> usage -> invoice'),
    f('charge-and-receipt.flow.ts', 'charge payment -> ledger -> receipt'), f('refund-and-credit.flow.ts', 'refund -> credit -> notify'),
    f('dunning.flow.ts', 'failed payment -> dunning -> recover'), f('meter-usage.flow.ts', 'usage event -> meter -> rate'),
    f('deps.ts', 'deps bundle'), f('events.ts', 'commerce flow events'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'flows-marketplace') return [
    f('onboard-agent.flow.ts', 'identity -> registry -> listing -> reputation init'), f('publish-service.flow.ts', 'create + publish marketplace listing'),
    f('discover-and-hire.flow.ts', 'discover service -> hire via CAP'), f('rate-and-review.flow.ts', 'review -> reputation update'),
    f('reputation-update.flow.ts', 'order outcome -> PTS update'), f('deps.ts', 'deps'), f('events.ts', 'events'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'flows-lifecycle') return [
    f('start-trial.flow.ts', 'eligibility -> start trial -> onboarding'), f('convert-trial.flow.ts', 'trial -> subscription'),
    f('onboarding.flow.ts', 'drive onboarding checklist'), f('churn-intervention.flow.ts', 'risk -> intervention'),
    f('grant-credits.flow.ts', 'grant + ledger credits'), f('deps.ts', 'deps'), f('events.ts', 'events'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'flows-compliance') return [
    f('dsr-fulfillment.flow.ts', 'data subject request -> collect -> deliver'), f('erasure.flow.ts', 'erasure across stores'),
    f('retention-purge.flow.ts', 'evaluate retention -> purge'), f('audit-export.flow.ts', 'export audit to SIEM'),
    f('consent-capture.flow.ts', 'capture + record consent'), f('deps.ts', 'deps'), f('events.ts', 'events'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'flows-data') return [
    f('etl-load.flow.ts', 'extract -> transform -> load to warehouse'), f('report-generate.flow.ts', 'query -> report -> deliver'),
    f('usage-rollup.flow.ts', 'usage events -> warehouse rollup'), f('verification-analytics.flow.ts', 'reports -> analytics warehouse'),
    f('deps.ts', 'deps'), f('events.ts', 'events'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'event-wiring') return [
    f('event-map.ts', 'map domain events -> handlers'), f('subscribe.ts', 'subscribe handlers to bus'), f('outbox-bridge.ts', 'cdc outbox -> messaging'),
    f('webhook-bridge.ts', 'domain events -> webhooks dispatch'), f('notification-bridge.ts', 'events -> notifications'),
    f('projection-bridge.ts', 'events -> read projections'), f('registry.ts', 'wiring registry'), f('bootstrap.ts', 'wire all bridges'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'orchestration') return [
    f('register-sagas.ts', 'register saga definitions'), f('saga-runner.ts', 'run sagas via engine'), f('flow-to-saga.ts', 'adapt flows to saga steps'),
    f('long-running.ts', 'long-running workflow registration'), f('scheduler-bridge.ts', 'schedule orchestrations'),
    f('registry.ts', 'orchestration registry'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'wiring') return [
    f('build-platform-container.ts', 'build a fully-wired DI container'), f('register-repositories.ts', 'register all repositories'),
    f('register-services.ts', 'register all services'), f('register-flows.ts', 'register all flow factories'),
    f('register-providers.ts', 'register llm/cap/payment providers'), f('register-observability.ts', 'register logger/metrics/tracer'),
    f('tokens.ts', 'integration DI tokens'), f('defaults.ts', 'default in-memory wiring'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'composition') return [
    f('compose-server.ts', 'compose one express app mounting many sub-apps'), f('mount.ts', 'mount a sub-app under a base path'),
    f('app-registry.ts', 'registry of mountable apps'), f('router-composition.ts', 'merge routers'), f('middleware-stack.ts', 'shared middleware stack'),
    f('worker-composition.ts', 'compose + start background workers'), f('lifecycle.ts', 'start/stop composed components'),
    f('graceful-shutdown.ts', 'graceful shutdown of all'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'health-wiring') return [
    f('register-checks.ts', 'register health checks for all subsystems'), f('aggregate.ts', 'aggregate platform health'),
    f('readiness.ts', 'readiness probe wiring'), f('liveness.ts', 'liveness probe wiring'), f('dependency-checks.ts', 'dependency checks'),
    f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'platform') return [
    f('main.ts', 'unified platform entrypoint (one process, all surfaces)'), f('bootstrap.ts', 'build container + compose apps + wire events'),
    f('http.ts', 'compose all HTTP apps into one server'), f('workers.ts', 'start all background workers'),
    f('agent.ts', 'start the CAP provider agent'), f('health.ts', 'expose health endpoints'), f('config.ts', 'platform config'),
    f('shutdown.ts', 'graceful shutdown'), f('runtime.ts', 'supervise components'), f('index.ts', 're-export')]
  if (key === 'all-in-one') return [
    f('main.ts', 'dev all-in-one entrypoint'), f('run.ts', 'run platform with in-memory wiring + seed'), f('seed.ts', 'seed demo data'),
    f('config.ts', 'dev config'), f('index.ts', 're-export')]
  return []
}

function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }
const units = []
let totalFiles = 0
for (const pkg of ALL) {
  const files = filesFor(pkg.key)
  totalFiles += files.length
  chunk(files, 5).forEach((g, i, arr) => units.push({ pkg, allFiles: files, assigned: g, idx: i, groups: arr.length }))
}

const EXPORTS_SCHEMA = { type: 'object', additionalProperties: false, properties: { core: { type: 'array', items: { type: 'string' } }, contracts: { type: 'array', items: { type: 'string' } } }, required: ['core', 'contracts'] }
const TSC_SCHEMA = { type: 'object', additionalProperties: false, properties: { errorCount: { type: 'number' }, topModules: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { module: { type: 'string' }, errors: { type: 'number' } }, required: ['module', 'errors'] } } }, required: ['errorCount', 'topModules'] }

phase('Scaffold')
const pkgList = JSON.stringify(ALL.map((p) => ({ name: '@veritas/' + p.key, dir: p.dir })))
await agent([ARCH, '',
  'Create per-module package.json files ONLY. Do NOT read or edit the root tsconfig.json or root package.json (global wildcard alias handles resolution; another build runs concurrently).',
  'For EACH module below create ' + BASE + '/<dir>/package.json = {"name":"<name>","version":"1.0.0","type":"module","main":"src/index.ts","types":"src/index.ts"}.',
  'MODULES (name, dir): ' + pkgList, 'Reply only {"written":N}.',
].join('\n'), { label: 'scaffold-pkg', phase: 'Scaffold', effort: 'low' })
log('per-module package.json created')

phase('Discover')
const disc = await agent('Read ' + BASE + '/packages/core/src/index.ts and ' + BASE + '/packages/contracts/src/index.ts. Return exported identifier names from each. Do not write files.', { label: 'discover', phase: 'Discover', schema: EXPORTS_SCHEMA, effort: 'low' })
const CHEAT = ['SHARED FOUNDATION (import, do not redefine):', '@veritas/core exports: ' + ((disc && disc.core) || []).join(', '), '@veritas/contracts exports: ' + ((disc && disc.contracts) || []).join(', '), 'Cross-package import alias @veritas/<pkg>; within-package relative imports use .js. For OTHER dependency packages, READ their src/index.ts to confirm exact export names before importing.'].join('\n')

phase('Implement')
log(`fanning out ${units.length} units covering ${totalFiles} new files across ${ALL.length} modules`)
function implPrompt(u) {
  const fileList = u.allFiles.map((x) => `  - src/${x.p} : ${x.d}`).join('\n')
  const assigned = u.assigned.map((x) => `${BASE}/${u.pkg.dir}/src/${x.p}`).join('\n')
  const depDirs = (u.pkg.deps || []).map((d) => `@veritas/${d} (read ${BASE}/packages/${d}/src/index.ts or ${BASE}/apps/${d}/src/index.ts)`).join('; ')
  return [ARCH, '', CHEAT, '', `You implement part of @veritas/${u.pkg.key} (dir ${u.pkg.dir}). It composes these dependencies: ${depDirs}.`,
    'IMPORTANT: Read the src/index.ts of EACH dependency you import to learn its real exports BEFORE writing imports.',
    'FULL module file list (for sibling imports via ./paths .js):', fileList, '',
    'WRITE ONLY these (exact absolute paths), fully implemented, strict-clean:', assigned, '',
    'If you write src/index.ts, re-export the module public surface. Reply only {"written":N}.'].join('\n')
}
const impl = await parallel(units.map((u) => () => agent(implPrompt(u), { label: `impl:${u.pkg.key}/${u.idx + 1}of${u.groups}`, phase: 'Implement', model: 'sonnet', effort: 'medium' })))
const implDone = impl.filter(Boolean).length
log(`implementation finished: ${implDone}/${units.length}`)

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
  const OUR = new Set(ALL.map((p) => p.dir))
  const targets = (tsc1.topModules || []).filter((m) => m.errors > 0 && OUR.has(m.module)).slice(0, 30)
  await parallel(targets.map((t) => () => {
    const safe = t.module.replace('/', '_')
    return agent([ARCH, '', CHEAT, '', 'Repair strict TypeScript errors in module ' + BASE + '/' + t.module + ' (ONLY this module\'s files).',
      'Read /tmp/fix-' + WAVE + '/' + safe + '.txt for this module\'s tsc errors. Fix every listed error properly. For "no exported member" against another @veritas/* pkg, Read that pkg\'s src/index.ts and fix YOUR import name; never edit other modules. No `any` unless unavoidable. Reply only {"fixed":true}.',
    ].join('\n'), { label: `fix:${t.module}`, phase: 'Fix', model: 'sonnet', effort: 'high' })
  }))
  const tsc2 = await agent(tscPrompt, { label: 'typecheck-2', phase: 'Fix', schema: TSC_SCHEMA, effort: 'low' })
  last = tsc2 ? tsc2.errorCount : last
  log(`typecheck after fix: ${last} errors`)
}

return { newModules: ALL.length, unitsDispatched: units.length, filesPlanned: totalFiles, implAgentsCompleted: implDone, tscErrorsInitial: tsc1 ? tsc1.errorCount : null, tscErrorsFinal: last }
