export const meta = {
  name: 'veritas-wave3',
  description: 'Wave 3: product & commerce layer — 18 new modules, ~390 more TS files',
  phases: [
    { title: 'Scaffold', detail: 'merge new modules into root configs' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across commerce/product modules' },
    { title: 'Integrate', detail: 'install (idempotent) + typecheck' },
    { title: 'Fix', detail: 'bounded type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform (CAP agent + REST/GraphQL APIs + SDK).',
  'This workflow ADDS new commerce/product modules to the EXISTING monorepo at ' + BASE + '.',
  'GLOBAL RULES (follow exactly):',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs/empty bodies). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data.',
  '- Foundation you may import: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Money, Clock, canonicalize, contentHash), @veritas/contracts (zod schemas + types), @veritas/observability, @veritas/persistence, @veritas/services, @veritas/config, @veritas/auth.',
  '- Use only deps already installed (zod, express, pino, nanoid, @anthropic-ai/sdk, @croo-network/sdk). Model external systems (vector DB, payment processor, websocket) behind PORT INTERFACES with in-memory/console implementations — do NOT add new npm dependencies.',
  '- Do NOT run npm/tsc/git unless told. ONLY Write files at the EXACT absolute paths given. Do not modify files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}. Do not echo file contents.',
].join('\n')

const PACKAGES = [
  { key: 'payments', dir: 'packages/payments', deps: ['core', 'contracts', 'persistence'] },
  { key: 'reputation', dir: 'packages/reputation', deps: ['core', 'contracts'] },
  { key: 'marketplace', dir: 'packages/marketplace', deps: ['core', 'contracts', 'reputation'] },
  { key: 'pricing-engine', dir: 'packages/pricing-engine', deps: ['core', 'contracts'] },
  { key: 'sla', dir: 'packages/sla', deps: ['core', 'contracts', 'observability'] },
  { key: 'dispute', dir: 'packages/dispute', deps: ['core', 'contracts', 'persistence'] },
  { key: 'realtime', dir: 'packages/realtime', deps: ['core', 'observability'] },
  { key: 'sagas', dir: 'packages/sagas', deps: ['core', 'observability'] },
  { key: 'connectors', dir: 'packages/connectors', deps: ['core', 'contracts'] },
  { key: 'datasource', dir: 'packages/datasource', deps: ['core', 'contracts'] },
  { key: 'embeddings', dir: 'packages/embeddings', deps: ['core'] },
  { key: 'knowledge', dir: 'packages/knowledge', deps: ['core', 'contracts', 'embeddings'] },
  { key: 'policy', dir: 'packages/policy', deps: ['core'] },
  { key: 'export', dir: 'packages/export', deps: ['core', 'contracts'] },
]
const APPS = [
  { key: 'public-api', dir: 'apps/public-api', deps: ['core', 'contracts', 'services', 'auth', 'pricing-engine', 'observability', 'config'] },
  { key: 'agent-orchestrator', dir: 'apps/agent-orchestrator', deps: ['core', 'contracts', 'cap', 'verification', 'sagas', 'observability'] },
  { key: 'metrics-exporter', dir: 'apps/metrics-exporter', deps: ['core', 'observability'] },
  { key: 'webhook-gateway', dir: 'apps/webhook-gateway', deps: ['core', 'contracts', 'webhooks', 'auth', 'observability'] },
]
const ALL = [...PACKAGES, ...APPS]

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })
const PUB_RES = ['verification', 'reports', 'agents', 'usage', 'webhooks', 'api-keys', 'pricing', 'health']

function filesFor(key) {
  const o = []
  if (key === 'payments') o.push(
    f('payment.ts', 'Payment + status'), f('processor.ts', 'PaymentProcessor port'), f('charge.ts', 'charge flow'),
    f('refund.ts', 'refund flow'), f('payout.ts', 'provider payout'), f('ledger-entry.ts', 'double-entry ledger entry'),
    f('ledger.ts', 'append-only ledger'), f('reconciliation.ts', 'reconcile on-chain settlements'),
    f('providers/usdc-onchain.ts', 'USDC on-chain settlement processor (port impl)'), f('providers/mock-processor.ts', 'mock processor'),
    f('providers/processor-registry.ts', 'registry'), f('idempotency.ts', 'payment idempotency'), f('money.ts', 'amount helpers'),
    f('fee.ts', 'platform fee calc'), f('invoice-link.ts', 'link payments->invoices'), f('webhook-events.ts', 'payment events'),
    f('store.ts', 'payment repo interface+memory'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'reputation') o.push(
    f('pts-score.ts', 'Provider Trust Score (CAP reputation)'), f('reputation-event.ts', 'rep event'),
    f('rating.ts', 'rating value object'), f('review.ts', 'review entity'), f('trust-graph.ts', 'agent trust graph'),
    f('decay.ts', 'time decay of reputation'), f('aggregator.ts', 'aggregate events->score'), f('ranking.ts', 'rank agents'),
    f('weighting.ts', 'event weights'), f('badge.ts', 'reputation badges'), f('store.ts', 'rep repo interface+memory'),
    f('calculator.ts', 'score calculator'), f('history.ts', 'score history'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'marketplace') o.push(
    f('listing.ts', 'marketplace listing'), f('catalog.ts', 'service catalog'), f('category.ts', 'categories'),
    f('tag.ts', 'tags'), f('search-index.ts', 'listing search index port'), f('matcher.ts', 'match buyer needs->services'),
    f('ranking.ts', 'rank listings'), f('recommendation.ts', 'recommend services'), f('review.ts', 'listing review'),
    f('rating-summary.ts', 'aggregate ratings'), f('featured.ts', 'featured/promoted'), f('discovery.ts', 'discovery service'),
    f('query.ts', 'marketplace query'), f('filters.ts', 'filters'), f('store.ts', 'listing repo interface+memory'),
    f('publish.ts', 'publish/unpublish'), f('moderation.ts', 'listing moderation'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'pricing-engine') o.push(
    f('quote.ts', 'price quote'), f('price-rule.ts', 'pricing rule'), f('calculator.ts', 'compute price'),
    f('discount.ts', 'discount'), f('promo-code.ts', 'promo codes'), f('tier.ts', 'usage tiers'),
    f('currency.ts', 'currency'), f('fx.ts', 'fx conversion port'), f('volume-pricing.ts', 'volume discounts'),
    f('surcharge.ts', 'surcharges'), f('rule-engine.ts', 'apply rules in order'), f('catalog.ts', 'price catalog'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'sla') o.push(
    f('sla.ts', 'SLA definition'), f('target.ts', 'SLA targets'), f('metric.ts', 'measured metrics'),
    f('monitor.ts', 'SLA monitor'), f('breach.ts', 'breach detection'), f('credit.ts', 'service credit on breach'),
    f('evaluator.ts', 'evaluate compliance'), f('window.ts', 'measurement window'), f('report.ts', 'SLA report'),
    f('policy.ts', 'SLA policy'), f('store.ts', 'sla store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'dispute') o.push(
    f('dispute.ts', 'dispute entity'), f('state-machine.ts', 'open->review->resolved'), f('evidence.ts', 'dispute evidence'),
    f('arbitration.ts', 'arbitration'), f('resolution.ts', 'resolution outcomes'), f('escalation.ts', 'escalation'),
    f('policy.ts', 'dispute policy'), f('clear.ts', 'CAP clear vs dispute mapping'), f('timeline.ts', 'event timeline'),
    f('reasons.ts', 'dispute reasons'), f('store.ts', 'dispute repo'), f('service.ts', 'dispute service'),
    f('notifications.ts', 'dispute notify hooks'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'realtime') o.push(
    f('channel.ts', 'channel'), f('hub.ts', 'pub/sub hub'), f('subscription.ts', 'subscription'),
    f('event-stream.ts', 'event stream'), f('sse.ts', 'SSE port'), f('websocket-port.ts', 'websocket port'),
    f('broadcaster.ts', 'broadcaster'), f('presence.ts', 'presence tracking'), f('backpressure.ts', 'backpressure'),
    f('topic.ts', 'topics'), f('memory-hub.ts', 'in-memory hub'), f('serializer.ts', 'frame serializer'),
    f('heartbeat.ts', 'heartbeat'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'sagas') {
    o.push(f('saga.ts', 'Saga definition'), f('step.ts', 'saga step + compensation'), f('orchestrator.ts', 'run saga'),
      f('compensation.ts', 'compensation runner'), f('state.ts', 'saga state'), f('store.ts', 'saga state store'),
      f('context.ts', 'saga context'), f('retry.ts', 'step retry'), f('errors.ts', 'errors'), f('builder.ts', 'saga builder DSL'), f('index.ts', 're-export'))
    for (const s of ['verify-and-settle', 'onboard-agent', 'monthly-billing', 'dispute-resolution', 'refund-and-credit']) o.push(f(`definitions/${s}.saga.ts`, `${cap(s)} saga`))
  } else if (key === 'connectors') {
    o.push(f('connector.ts', 'Connector port'), f('registry.ts', 'connector registry'), f('dispatcher.ts', 'dispatch events->connectors'),
      f('mapping.ts', 'event->message mapping'), f('payload.ts', 'outbound payload'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
    for (const c of ['slack', 'discord', 'github', 'zapier', 'webhook', 'email', 'teams']) o.push(f(`providers/${c}.connector.ts`, `${cap(c)} connector`))
  } else if (key === 'datasource') o.push(
    f('source.ts', 'source record'), f('domain-authority.ts', 'domain authority scoring'), f('credibility-score.ts', 'credibility'),
    f('allowlist.ts', 'trusted domains'), f('blocklist.ts', 'blocked domains'), f('registry.ts', 'source registry'),
    f('importer.ts', 'import source lists'), f('classifier.ts', 'classify source type'), f('reputation-link.ts', 'tie source<->reputation'),
    f('query.ts', 'source query'), f('store.ts', 'source store'), f('seed.ts', 'seed known authorities'),
    f('normalizer.ts', 'normalize domains'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'embeddings') o.push(
    f('vector.ts', 'vector type + math'), f('vector-store.ts', 'VectorStore port'), f('memory-vector-store.ts', 'in-memory store'),
    f('similarity.ts', 'cosine/dot similarity'), f('embedder.ts', 'Embedder port'), f('hash-embedder.ts', 'deterministic hash embedder'),
    f('indexer.ts', 'index claims'), f('semantic-dedup.ts', 'dedup claims by similarity'), f('query.ts', 'knn query'),
    f('chunk.ts', 'text chunking'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'knowledge') o.push(
    f('fact-cache.ts', 'cache of previously verified claims'), f('claim-fingerprint.ts', 'fingerprint claims'),
    f('knowledge-record.ts', 'kb record'), f('lookup.ts', 'lookup prior verdict'), f('ttl.ts', 'freshness policy'),
    f('confidence-blend.ts', 'blend cached + fresh'), f('store.ts', 'kb store'), f('invalidation.ts', 'invalidate stale facts'),
    f('stats.ts', 'cache stats'), f('query.ts', 'kb query'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'policy') o.push(
    f('rule.ts', 'policy rule'), f('policy.ts', 'policy set'), f('condition.ts', 'conditions'), f('action.ts', 'actions'),
    f('evaluator.ts', 'evaluate policy'), f('decision.ts', 'decision result'), f('registry.ts', 'policy registry'),
    f('context.ts', 'eval context'), f('dsl.ts', 'tiny rule DSL parser'), f('combinator.ts', 'combine decisions'),
    f('verification-rules.ts', 'rules for verification jobs'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'export') o.push(
    f('exporter.ts', 'Exporter port'), f('format.ts', 'export formats'), f('json-exporter.ts', 'json'),
    f('csv-exporter.ts', 'csv'), f('markdown-exporter.ts', 'markdown'), f('pdf-exporter.ts', 'pdf (port impl)'),
    f('html-exporter.ts', 'html'), f('template.ts', 'export template'), f('branding.ts', 'branding options'),
    f('report-exporter.ts', 'export verification reports'), f('registry.ts', 'exporter registry'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  // apps
  else if (key === 'public-api') {
    o.push(f('main.ts', 'public-api entrypoint'), f('app.ts', 'build app'), f('versioning.ts', 'v1 api versioning'),
      f('router.ts', 'mount v1 routers'), f('middleware/auth.ts', 'public api-key auth'), f('middleware/rate-limit.ts', 'rate limit'),
      f('middleware/quota.ts', 'plan quota'), f('middleware/error-handler.ts', 'errors'), f('middleware/usage-meter.ts', 'meter usage'),
      f('http/responder.ts', 'envelope'), f('http/api-error.ts', 'http error'), f('openapi.ts', 'public openapi v1'), f('index.ts', 're-export'))
    for (const r of PUB_RES) o.push(f(`v1/${r}.routes.ts`, `v1 ${cap(r)} routes`), f(`v1/${r}.controller.ts`, `v1 ${cap(r)} controller`))
  } else if (key === 'agent-orchestrator') o.push(
    f('main.ts', 'orchestrator entrypoint'), f('orchestrator.ts', 'compose multi-agent pipelines'),
    f('pipeline.ts', 'verification pipeline across agents'), f('plan.ts', 'execution plan'), f('step.ts', 'pipeline step'),
    f('cap-agent-client.ts', 'hire other CAP agents'), f('aggregate-verdicts.ts', 'merge multi-agent verdicts'),
    f('consensus.ts', 'consensus across verifiers'), f('router.ts', 'route claims to specialists'), f('registry.ts', 'agent registry'),
    f('strategies/fan-out.ts', 'fan-out strategy'), f('strategies/escalate.ts', 'escalation strategy'), f('strategies/cheapest-first.ts', 'cost strategy'),
    f('runtime.ts', 'supervisor'), f('config.ts', 'config'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'metrics-exporter') o.push(
    f('main.ts', 'exporter entrypoint'), f('exporter.ts', 'expose metrics endpoint'), f('prometheus.ts', 'prometheus text format'),
    f('collector.ts', 'collect from registry'), f('format.ts', 'format helpers'), f('server.ts', 'http server'),
    f('labels.ts', 'label helpers'), f('config.ts', 'config'), f('index.ts', 're-export'))
  else if (key === 'webhook-gateway') o.push(
    f('main.ts', 'gateway entrypoint'), f('app.ts', 'build app'), f('inbound.ts', 'receive inbound webhooks'),
    f('verify-signature.ts', 'verify signatures'), f('router.ts', 'route by source'), f('dispatcher.ts', 'dispatch to handlers'),
    f('handlers/cap-events.ts', 'handle CAP webhook events'), f('handlers/payment-events.ts', 'payment events'),
    f('replay.ts', 'replay protection'), f('config.ts', 'config'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
  return o
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
  'Update EXISTING root configs at ' + BASE + ' to register these NEW modules, then create each one\'s package.json.',
  'NEW (name, dir): ' + pkgList,
  '1) Read ' + BASE + '/tsconfig.json; for EACH new module add compilerOptions.paths "@veritas/<short>":["<dir>/src/index.ts"] and "@veritas/<short>/*":["<dir>/src/*"] (short = name minus @veritas/). Keep existing paths. Save valid JSON.',
  '2) Read ' + BASE + '/package.json; add scripts "public-api":"tsx apps/public-api/src/main.ts","orchestrator":"tsx apps/agent-orchestrator/src/main.ts","metrics":"tsx apps/metrics-exporter/src/main.ts","webhook-gateway":"tsx apps/webhook-gateway/src/main.ts". Do NOT add new dependencies. Save valid JSON keeping existing fields.',
  '3) For EACH new module create <dir>/package.json = {"name":"@veritas/<short>","version":"1.0.0","type":"module","main":"src/index.ts","types":"src/index.ts"}.',
  'Reply only {"written":N}.',
].join('\n'), { label: 'scaffold-merge', phase: 'Scaffold', effort: 'high' })
log('scaffold merge complete')

phase('Discover')
const disc = await agent([
  'Read ' + BASE + '/packages/core/src/index.ts and ' + BASE + '/packages/contracts/src/index.ts. Return exported identifier names from each. Do not write files.',
].join('\n'), { label: 'discover', phase: 'Discover', schema: EXPORTS_SCHEMA, effort: 'low' })
const CHEAT = [
  'SHARED FOUNDATION (import, do not redefine):',
  '@veritas/core exports: ' + ((disc && disc.core) || []).join(', '),
  '@veritas/contracts exports: ' + ((disc && disc.contracts) || []).join(', '),
  'Cross-package import alias @veritas/<pkg>; within-package relative imports use .js.',
].join('\n')

phase('Implement')
log(`fanning out ${units.length} units covering ${totalFiles} new files across ${ALL.length} modules`)
function implPrompt(u) {
  const fileList = u.allFiles.map((x) => `  - src/${x.p} : ${x.d}`).join('\n')
  const assigned = u.assigned.map((x) => `${BASE}/${u.pkg.dir}/src/${x.p}`).join('\n')
  const depAliases = (u.pkg.deps || []).map((d) => '@veritas/' + d).join(', ')
  return [ARCH, '', CHEAT, '',
    `You implement part of @veritas/${u.pkg.key} (dir ${u.pkg.dir}). May import from: ${depAliases}.`,
    'FULL module file list (for sibling imports via ./paths .js):', fileList, '',
    'WRITE ONLY these (exact absolute paths), fully implemented, strict-clean:', assigned, '',
    'If you write src/index.ts, re-export the module public surface. Reply only {"written":N}.'].join('\n')
}
const impl = await parallel(units.map((u) => () => agent(implPrompt(u), { label: `impl:${u.pkg.key}/${u.idx + 1}of${u.groups}`, phase: 'Implement', model: 'sonnet', effort: 'medium' })))
const implDone = impl.filter(Boolean).length
log(`implementation finished: ${implDone}/${units.length}`)

phase('Integrate')
await agent('At ' + BASE + ': run `cd ' + BASE + ' && ([ -d node_modules/typescript ] && echo "deps present" || npm install)`. Idempotent — do not force reinstall. One line outcome. Do not edit source.', { label: 'install', phase: 'Integrate', effort: 'low' })
const tscPrompt = [
  'Typecheck at ' + BASE + '. Run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 > /tmp/vtsc.txt; grep -c "error TS" /tmp/vtsc.txt`;',
  'per-module: `grep -oE "^(packages|apps|examples)/[^/]+" /tmp/vtsc.txt | sort | uniq -c | sort -rn | head -40`;',
  'regenerate fix files: `rm -rf /tmp/fix && mkdir -p /tmp/fix && grep "error TS" /tmp/vtsc.txt | while IFS= read -r l; do m=$(echo "$l" | grep -oE "^(packages|apps|examples)/[^/]+"); [ -z "$m" ] && continue; s=$(echo "$m" | tr "/" "_"); echo "$l" >> /tmp/fix/$s.txt; done`.',
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
    return agent([ARCH, '', CHEAT, '',
      'You are repairing strict TypeScript errors in module ' + BASE + '/' + t.module + ' (ONLY this module\'s files).',
      'Read /tmp/fix/' + safe + '.txt for this module\'s tsc errors. Fix every listed error properly. ' +
      'For "no exported member" against another @veritas/* pkg, Read that pkg\'s src/index.ts and fix YOUR import name; never edit other modules. No `any` unless unavoidable. Reply only {"fixed":true}.',
    ].join('\n'), { label: `fix:${t.module}`, phase: 'Fix', model: 'sonnet', effort: 'high' })
  }))
  const tsc2 = await agent(tscPrompt, { label: 'typecheck-2', phase: 'Fix', schema: TSC_SCHEMA, effort: 'low' })
  last = tsc2 ? tsc2.errorCount : last
  log(`typecheck after fix: ${last} errors`)
}

return { newModules: ALL.length, unitsDispatched: units.length, filesPlanned: totalFiles, implAgentsCompleted: implDone, tscErrorsInitial: tsc1 ? tsc1.errorCount : null, tscErrorsFinal: last }
