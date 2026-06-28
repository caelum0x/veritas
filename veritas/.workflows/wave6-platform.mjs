export const meta = {
  name: 'veritas-wave6',
  description: 'Wave 6: operations & scale — sharding, replication, CDC, SLO, incidents, experimentation, workflow engine (~290 files)',
  phases: [
    { title: 'Scaffold', detail: 'merge new modules into root configs' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across ops/scale modules' },
    { title: 'Integrate', detail: 'install (idempotent) + typecheck' },
    { title: 'Fix', detail: 'bounded type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform.',
  'This workflow ADDS operations & scale infrastructure modules to the EXISTING monorepo at ' + BASE + '.',
  'GLOBAL RULES (follow exactly):',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs/empty bodies). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data.',
  '- Foundation you may import: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Money, Clock, canonicalize, contentHash), @veritas/contracts, @veritas/observability, @veritas/persistence, @veritas/messaging, @veritas/config.',
  '- Model infra (databases, regions, schedulers, metrics backends) behind PORT INTERFACES with in-memory/mock implementations. Use ONLY installed deps (zod, express, pino, nanoid). Do NOT add new npm deps.',
  '- Do NOT run npm/tsc/git unless told. ONLY Write files at the EXACT absolute paths given. Do not modify files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}. Do not echo file contents.',
].join('\n')

const PACKAGES = [
  { key: 'sharding', dir: 'packages/sharding', deps: ['core'] },
  { key: 'replication', dir: 'packages/replication', deps: ['core', 'persistence'] },
  { key: 'cdc', dir: 'packages/cdc', deps: ['core', 'messaging'] },
  { key: 'backup', dir: 'packages/backup', deps: ['core', 'persistence'] },
  { key: 'resilience', dir: 'packages/resilience', deps: ['core', 'observability'] },
  { key: 'slo', dir: 'packages/slo', deps: ['core', 'observability'] },
  { key: 'incident', dir: 'packages/incident', deps: ['core', 'contracts', 'observability'] },
  { key: 'capacity', dir: 'packages/capacity', deps: ['core', 'observability'] },
  { key: 'cost', dir: 'packages/cost', deps: ['core', 'contracts'] },
  { key: 'experimentation', dir: 'packages/experimentation', deps: ['core', 'contracts'] },
  { key: 'health-aggregation', dir: 'packages/health-aggregation', deps: ['core', 'observability'] },
  { key: 'otel', dir: 'packages/otel', deps: ['core', 'observability'] },
  { key: 'queue-advanced', dir: 'packages/queue-advanced', deps: ['core', 'messaging'] },
  { key: 'workflow-engine', dir: 'packages/workflow-engine', deps: ['core', 'observability'] },
  { key: 'multi-region', dir: 'packages/multi-region', deps: ['core', 'config'] },
  { key: 'autoscaling', dir: 'packages/autoscaling', deps: ['core', 'observability'] },
]
const APPS = [
  { key: 'ops-api', dir: 'apps/ops-api', deps: ['core', 'contracts', 'incident', 'slo', 'cost', 'capacity', 'auth', 'observability'] },
  { key: 'status-page', dir: 'apps/status-page', deps: ['core', 'health-aggregation', 'slo', 'observability'] },
]
const ALL = [...PACKAGES, ...APPS]

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })

function filesFor(key) {
  if (key === 'sharding') return [
    f('shard-key.ts', 'derive shard key'), f('ring.ts', 'consistent hash ring'), f('router.ts', 'route to shard'),
    f('rebalance.ts', 'rebalance plan'), f('shard.ts', 'shard descriptor'), f('strategy.ts', 'sharding strategies'),
    f('hash.ts', 'hashing'), f('registry.ts', 'shard registry'), f('migration.ts', 'shard migration plan'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'replication') return [
    f('replica-set.ts', 'replica set'), f('read-write-split.ts', 'route reads to replicas'), f('lag.ts', 'replication lag tracking'),
    f('failover.ts', 'replica failover'), f('consistency.ts', 'read consistency levels'), f('router.ts', 'replica router'),
    f('health.ts', 'replica health'), f('repository-wrapper.ts', 'wrap repo with read/write split'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'cdc') return [
    f('change-event.ts', 'change data capture event'), f('outbox-relay.ts', 'relay outbox -> stream'), f('stream.ts', 'change stream'),
    f('capture.ts', 'capture changes'), f('cursor.ts', 'stream cursor'), f('publisher.ts', 'publish changes'),
    f('subscriber.ts', 'subscribe to changes'), f('transform.ts', 'transform events'), f('dedupe.ts', 'dedupe changes'),
    f('projection.ts', 'project changes'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'backup') return [
    f('backup.ts', 'Backup port'), f('restore.ts', 'restore'), f('snapshot.ts', 'snapshot'), f('schedule.ts', 'backup schedule'),
    f('retention.ts', 'retention policy'), f('store.ts', 'backup store port'), f('manifest.ts', 'backup manifest'),
    f('verify.ts', 'verify backup integrity'), f('encryption.ts', 'backup encryption hook'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'resilience') return [
    f('circuit-breaker.ts', 'circuit breaker'), f('bulkhead.ts', 'bulkhead isolation'), f('timeout.ts', 'timeout wrapper'),
    f('retry-budget.ts', 'retry budget'), f('fallback.ts', 'fallback'), f('rate-guard.ts', 'rate guard'),
    f('hedge.ts', 'hedged requests'), f('policy.ts', 'compose policies'), f('state.ts', 'breaker state'),
    f('decorators.ts', 'resilient() wrapper'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'slo') return [
    f('slo.ts', 'SLO definition'), f('sli.ts', 'service level indicator'), f('error-budget.ts', 'error budget'),
    f('burn-rate.ts', 'burn rate'), f('window.ts', 'rolling windows'), f('objective.ts', 'objective targets'),
    f('evaluator.ts', 'evaluate SLO'), f('alert.ts', 'multi-window burn alerts'), f('report.ts', 'SLO report'),
    f('store.ts', 'slo store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'incident') return [
    f('incident.ts', 'incident model'), f('severity.ts', 'severity levels'), f('state-machine.ts', 'incident lifecycle'),
    f('on-call.ts', 'on-call schedule'), f('escalation.ts', 'escalation policy'), f('responder.ts', 'responder assignment'),
    f('timeline.ts', 'incident timeline'), f('postmortem.ts', 'postmortem template'), f('detection.ts', 'auto-detect from alerts'),
    f('notification.ts', 'notify responders'), f('store.ts', 'incident store'), f('service.ts', 'incident service'),
    f('metrics.ts', 'MTTR/MTTA'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'capacity') return [
    f('capacity-model.ts', 'capacity model'), f('forecast.ts', 'demand forecast'), f('load.ts', 'load metrics'),
    f('headroom.ts', 'headroom calc'), f('planner.ts', 'capacity planner'), f('saturation.ts', 'saturation detection'),
    f('recommendation.ts', 'scaling recommendation'), f('report.ts', 'capacity report'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'cost') return [
    f('cost-event.ts', 'cost event'), f('allocation.ts', 'cost allocation by tenant/feature'), f('budget.ts', 'budgets'),
    f('alert.ts', 'budget alerts'), f('model-cost.ts', 'LLM/token cost model'), f('infra-cost.ts', 'infra cost model'),
    f('aggregator.ts', 'aggregate costs'), f('optimizer.ts', 'cost optimization hints'), f('report.ts', 'cost report'),
    f('forecast.ts', 'cost forecast'), f('store.ts', 'cost store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'experimentation') return [
    f('experiment.ts', 'experiment definition'), f('variant.ts', 'variants'), f('assignment.ts', 'deterministic assignment'),
    f('bucketing.ts', 'hash bucketing'), f('metric.ts', 'experiment metrics'), f('significance.ts', 'statistical significance'),
    f('analysis.ts', 'experiment analysis'), f('guardrail.ts', 'guardrail metrics'), f('registry.ts', 'experiment registry'),
    f('exposure.ts', 'log exposures'), f('targeting.ts', 'audience targeting'), f('store.ts', 'experiment store'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'health-aggregation') return [
    f('health-check.ts', 'health check port'), f('dependency.ts', 'dependency health'), f('aggregator.ts', 'aggregate component health'),
    f('status.ts', 'overall status'), f('probe.ts', 'liveness/readiness probes'), f('registry.ts', 'health registry'),
    f('history.ts', 'health history'), f('degradation.ts', 'graceful degradation signals'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'otel') return [
    f('span.ts', 'span model'), f('tracer.ts', 'tracer'), f('context-propagation.ts', 'trace context propagation'),
    f('exporter.ts', 'exporter port'), f('console-exporter.ts', 'console exporter'), f('otlp-exporter.ts', 'OTLP exporter port'),
    f('sampler.ts', 'sampler'), f('attributes.ts', 'semantic attributes'), f('metrics.ts', 'otel metrics'),
    f('resource.ts', 'resource info'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'queue-advanced') return [
    f('priority-queue.ts', 'priority queue'), f('delay-queue.ts', 'delayed delivery'), f('partitioned-queue.ts', 'partitioned queue'),
    f('rate-limited-queue.ts', 'rate-limited consumption'), f('dlq.ts', 'dead letter queue'), f('visibility.ts', 'visibility timeout'),
    f('ack.ts', 'ack/nack'), f('batch.ts', 'batch consume'), f('scheduler.ts', 'scheduled enqueue'), f('metrics.ts', 'queue metrics'),
    f('memory-impl.ts', 'in-memory impl'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'workflow-engine') return [
    f('workflow.ts', 'durable workflow definition'), f('activity.ts', 'activity/step'), f('engine.ts', 'execution engine'),
    f('state.ts', 'workflow state'), f('history.ts', 'event history'), f('replay.ts', 'deterministic replay'),
    f('timer.ts', 'durable timers'), f('signal.ts', 'external signals'), f('compensation.ts', 'compensation'),
    f('store.ts', 'workflow store'), f('worker.ts', 'workflow worker'), f('builder.ts', 'workflow builder'),
    f('context.ts', 'workflow context'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'multi-region') return [
    f('region.ts', 'region descriptor'), f('router.ts', 'region routing'), f('failover.ts', 'region failover'),
    f('geo.ts', 'geo resolution'), f('replication-policy.ts', 'cross-region replication'), f('residency.ts', 'data residency'),
    f('latency.ts', 'latency-based routing'), f('registry.ts', 'region registry'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'autoscaling') return [
    f('signal.ts', 'scaling signal'), f('policy.ts', 'scaling policy'), f('scaler.ts', 'scaler'), f('metric-target.ts', 'metric targets'),
    f('cooldown.ts', 'cooldown'), f('predictor.ts', 'predictive scaling'), f('limits.ts', 'min/max'), f('decision.ts', 'scale decision'),
    f('evaluator.ts', 'evaluate policies'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'ops-api') return [
    f('main.ts', 'ops-api entrypoint'), f('app.ts', 'build app'), f('router.ts', 'mount routers'), f('middleware/auth.ts', 'ops auth'),
    f('middleware/error-handler.ts', 'errors'), f('routes/incidents.routes.ts', 'incidents'), f('controllers/incidents.controller.ts', 'incidents ctrl'),
    f('routes/slo.routes.ts', 'slo'), f('controllers/slo.controller.ts', 'slo ctrl'), f('routes/cost.routes.ts', 'cost'),
    f('controllers/cost.controller.ts', 'cost ctrl'), f('routes/capacity.routes.ts', 'capacity'), f('controllers/capacity.controller.ts', 'capacity ctrl'),
    f('http/responder.ts', 'envelope'), f('http/api-error.ts', 'http error'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
  if (key === 'status-page') return [
    f('main.ts', 'status page entrypoint'), f('app.ts', 'build app'), f('status-service.ts', 'compute public status'),
    f('components.ts', 'tracked components'), f('incidents-feed.ts', 'public incident feed'), f('uptime.ts', 'uptime calc'),
    f('subscribe.ts', 'status subscriptions'), f('render.ts', 'render status json'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
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
await agent([
  ARCH, '',
  'Create per-module package.json files ONLY. Do NOT read or edit the root tsconfig.json or root package.json — path resolution is handled by a global wildcard alias and another build may be running concurrently.',
  'For EACH module below create ' + BASE + '/<dir>/package.json = {"name":"<name>","version":"1.0.0","type":"module","main":"src/index.ts","types":"src/index.ts"}.',
  'MODULES (name, dir): ' + pkgList,
  'Reply only {"written":N}.',
].join('\n'), { label: 'scaffold-pkg', phase: 'Scaffold', effort: 'low' })
log('per-module package.json created')

phase('Discover')
const disc = await agent('Read ' + BASE + '/packages/core/src/index.ts and ' + BASE + '/packages/contracts/src/index.ts. Return exported identifier names from each. Do not write files.', { label: 'discover', phase: 'Discover', schema: EXPORTS_SCHEMA, effort: 'low' })
const CHEAT = ['SHARED FOUNDATION (import, do not redefine):', '@veritas/core exports: ' + ((disc && disc.core) || []).join(', '), '@veritas/contracts exports: ' + ((disc && disc.contracts) || []).join(', '), 'Cross-package import alias @veritas/<pkg>; within-package relative imports use .js.'].join('\n')

phase('Implement')
log(`fanning out ${units.length} units covering ${totalFiles} new files across ${ALL.length} modules`)
function implPrompt(u) {
  const fileList = u.allFiles.map((x) => `  - src/${x.p} : ${x.d}`).join('\n')
  const assigned = u.assigned.map((x) => `${BASE}/${u.pkg.dir}/src/${x.p}`).join('\n')
  const depAliases = (u.pkg.deps || []).map((d) => '@veritas/' + d).join(', ')
  return [ARCH, '', CHEAT, '', `You implement part of @veritas/${u.pkg.key} (dir ${u.pkg.dir}). May import from: ${depAliases}.`,
    'FULL module file list (for sibling imports via ./paths .js):', fileList, '',
    'WRITE ONLY these (exact absolute paths), fully implemented, strict-clean:', assigned, '',
    'If you write src/index.ts, re-export the module public surface. Reply only {"written":N}.'].join('\n')
}
const impl = await parallel(units.map((u) => () => agent(implPrompt(u), { label: `impl:${u.pkg.key}/${u.idx + 1}of${u.groups}`, phase: 'Implement', model: 'sonnet', effort: 'medium' })))
const implDone = impl.filter(Boolean).length
log(`implementation finished: ${implDone}/${units.length}`)

phase('Integrate')
await agent('At ' + BASE + ': run `cd ' + BASE + ' && ([ -d node_modules/typescript ] && echo "deps present" || npm install)`. Idempotent. One line outcome. Do not edit source.', { label: 'install', phase: 'Integrate', effort: 'low' })
const tscPrompt = [
  'Typecheck at ' + BASE + '. Run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 > /tmp/vtsc-w6.txt; grep -c "error TS" /tmp/vtsc-w6.txt`;',
  'per-module: `grep -oE "^(packages|apps|examples)/[^/]+" /tmp/vtsc-w6.txt | sort | uniq -c | sort -rn | head -60`;',
  'regenerate fix files: `rm -rf /tmp/fix-w6 && mkdir -p /tmp/fix-w6 && grep "error TS" /tmp/vtsc-w6.txt | while IFS= read -r l; do m=$(echo "$l" | grep -oE "^(packages|apps|examples)/[^/]+"); [ -z "$m" ] && continue; s=$(echo "$m" | tr "/" "_"); echo "$l" >> /tmp/fix-w6/$s.txt; done`.',
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
      'Read /tmp/fix-w6/' + safe + '.txt for this module\'s tsc errors. Fix every listed error properly. For "no exported member" against another @veritas/* pkg, Read that pkg\'s src/index.ts and fix YOUR import name; never edit other modules. No `any` unless unavoidable. Reply only {"fixed":true}.',
    ].join('\n'), { label: `fix:${t.module}`, phase: 'Fix', model: 'sonnet', effort: 'high' })
  }))
  const tsc2 = await agent(tscPrompt, { label: 'typecheck-2', phase: 'Fix', schema: TSC_SCHEMA, effort: 'low' })
  last = tsc2 ? tsc2.errorCount : last
  log(`typecheck after fix: ${last} errors`)
}

return { newModules: ALL.length, unitsDispatched: units.length, filesPlanned: totalFiles, implAgentsCompleted: implDone, tscErrorsInitial: tsc1 ? tsc1.errorCount : null, tscErrorsFinal: last }
