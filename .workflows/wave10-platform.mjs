export const meta = {
  name: 'veritas-wave10',
  description: 'Wave 10: developer ecosystem & API platform — OpenAPI/SDK codegen, gRPC, federation, partner, dev portal (~290 files)',
  phases: [
    { title: 'Scaffold', detail: 'per-module package.json' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across devex modules' },
    { title: 'Integrate', detail: 'typecheck (own modules)' },
    { title: 'Fix', detail: 'own-module type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const WAVE = 'w10'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform.',
  'This workflow ADDS developer-ecosystem & API-platform modules to the EXISTING monorepo at ' + BASE + '. Another build may run concurrently — only write your assigned files.',
  'GLOBAL RULES:',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data.',
  '- Foundation: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Clock), @veritas/contracts, @veritas/observability, @veritas/auth, @veritas/sdk, @veritas/config.',
  '- Codegen modules emit STRINGS/descriptors (no real network/codegen tools). Model gRPC/partners behind PORT INTERFACES. Use ONLY installed deps (zod, express, pino, nanoid). NO new npm deps.',
  '- Do NOT edit root tsconfig.json or root package.json. Do NOT run npm/tsc/git. ONLY Write assigned files; never edit files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}.',
].join('\n')

const PACKAGES = [
  { key: 'openapi-gen', dir: 'packages/openapi-gen', deps: ['core', 'contracts'] },
  { key: 'sdk-codegen', dir: 'packages/sdk-codegen', deps: ['core', 'openapi-gen'] },
  { key: 'grpc', dir: 'packages/grpc', deps: ['core', 'contracts'] },
  { key: 'graphql-federation', dir: 'packages/graphql-federation', deps: ['core', 'contracts'] },
  { key: 'api-versioning', dir: 'packages/api-versioning', deps: ['core'] },
  { key: 'api-analytics', dir: 'packages/api-analytics', deps: ['core', 'observability'] },
  { key: 'mock-server', dir: 'packages/mock-server', deps: ['core', 'contracts'] },
  { key: 'sandbox-env', dir: 'packages/sandbox-env', deps: ['core', 'contracts'] },
  { key: 'partner', dir: 'packages/partner', deps: ['core', 'contracts', 'auth'] },
  { key: 'developer-portal', dir: 'packages/developer-portal', deps: ['core', 'contracts', 'auth'] },
  { key: 'changelog', dir: 'packages/changelog', deps: ['core'] },
  { key: 'postman-gen', dir: 'packages/postman-gen', deps: ['core', 'openapi-gen'] },
  { key: 'webhooks-sdk', dir: 'packages/webhooks-sdk', deps: ['core', 'contracts', 'crypto'] },
  { key: 'api-docs', dir: 'packages/api-docs', deps: ['core', 'openapi-gen'] },
  { key: 'request-signing', dir: 'packages/request-signing', deps: ['core', 'crypto'] },
  { key: 'idempotency', dir: 'packages/idempotency', deps: ['core', 'cache'] },
]
const APPS = [
  { key: 'developer-portal-api', dir: 'apps/developer-portal-api', deps: ['core', 'contracts', 'developer-portal', 'partner', 'auth', 'observability', 'config'] },
  { key: 'mock-api-server', dir: 'apps/mock-api-server', deps: ['core', 'contracts', 'mock-server', 'config'] },
]
const ALL = [...PACKAGES, ...APPS]

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })

function filesFor(key) {
  if (key === 'openapi-gen') return [
    f('document.ts', 'OpenAPI document model'), f('builder.ts', 'build OpenAPI doc'), f('zod-to-schema.ts', 'zod -> JSON schema'),
    f('path.ts', 'path item builder'), f('operation.ts', 'operation builder'), f('components.ts', 'components/schemas'),
    f('parameter.ts', 'parameters'), f('response.ts', 'responses'), f('security-scheme.ts', 'security schemes'),
    f('tag.ts', 'tags'), f('registry.ts', 'route registry -> spec'), f('serialize.ts', 'serialize to JSON/YAML-ish'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'sdk-codegen') return [
    f('generator.ts', 'SDK generator'), f('typescript-target.ts', 'TS client codegen'), f('python-target.ts', 'python client descriptor'),
    f('go-target.ts', 'go client descriptor'), f('model-gen.ts', 'generate models'), f('resource-gen.ts', 'generate resource clients'),
    f('naming.ts', 'naming conventions'), f('template.ts', 'code templates'), f('emitter.ts', 'string emitter'),
    f('package-meta.ts', 'package metadata'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'grpc') return [
    f('service.ts', 'gRPC service descriptor'), f('method.ts', 'method descriptor'), f('message.ts', 'message descriptor'),
    f('proto-emit.ts', 'emit .proto string'), f('server-port.ts', 'server port'), f('client-port.ts', 'client port'),
    f('codec.ts', 'codec'), f('status.ts', 'grpc status codes'), f('metadata.ts', 'metadata'), f('interceptor.ts', 'interceptors'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'graphql-federation') return [
    f('subgraph.ts', 'subgraph definition'), f('supergraph.ts', 'compose supergraph'), f('entity.ts', 'federated entities'),
    f('key.ts', '@key directive'), f('reference-resolver.ts', 'entity resolvers'), f('gateway.ts', 'federation gateway'),
    f('plan.ts', 'query plan'), f('stitch.ts', 'schema stitching'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'api-versioning') return [
    f('version.ts', 'API version'), f('negotiator.ts', 'version negotiation'), f('deprecation.ts', 'deprecation policy'),
    f('sunset.ts', 'sunset headers'), f('compatibility.ts', 'compat matrix'), f('router.ts', 'version routing'),
    f('migration.ts', 'request/response migration'), f('header.ts', 'version headers'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'api-analytics') return [
    f('event.ts', 'api call event'), f('collector.ts', 'collect calls'), f('aggregator.ts', 'aggregate by endpoint'),
    f('latency.ts', 'latency percentiles'), f('error-rate.ts', 'error rates'), f('top-consumers.ts', 'top consumers'),
    f('report.ts', 'api analytics report'), f('store.ts', 'analytics store'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'mock-server') return [
    f('mock.ts', 'mock definition'), f('responder.ts', 'mock responder'), f('matcher.ts', 'request matcher'),
    f('fixtures.ts', 'response fixtures'), f('generator.ts', 'generate mocks from contracts'), f('scenario.ts', 'scenarios'),
    f('stateful.ts', 'stateful mocks'), f('latency-sim.ts', 'simulate latency'), f('error-sim.ts', 'simulate errors'),
    f('registry.ts', 'mock registry'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'sandbox-env') return [
    f('sandbox.ts', 'sandbox environment'), f('seed-data.ts', 'sandbox seed data'), f('reset.ts', 'reset sandbox'),
    f('isolation.ts', 'sandbox isolation'), f('quota.ts', 'sandbox quotas'), f('credentials.ts', 'sandbox credentials'),
    f('lifecycle.ts', 'sandbox lifecycle'), f('registry.ts', 'sandbox registry'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'partner') return [
    f('partner.ts', 'partner org'), f('tier.ts', 'access tiers'), f('agreement.ts', 'partner agreement'),
    f('api-access.ts', 'API access grants'), f('quota.ts', 'partner quotas'), f('revenue-share.ts', 'revenue share'),
    f('onboarding.ts', 'partner onboarding'), f('contact.ts', 'partner contacts'), f('store.ts', 'partner store'),
    f('service.ts', 'partner service'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'developer-portal') return [
    f('app.ts', 'developer app'), f('api-key.ts', 'portal api keys'), f('usage-view.ts', 'usage views'),
    f('quota-view.ts', 'quota views'), f('docs-link.ts', 'docs references'), f('team.ts', 'dev team'),
    f('environment.ts', 'app environments'), f('webhook-config.ts', 'webhook config'), f('store.ts', 'portal store'),
    f('service.ts', 'portal service'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'changelog') return [
    f('entry.ts', 'changelog entry'), f('changelog.ts', 'changelog'), f('category.ts', 'change categories'),
    f('version.ts', 'versioned changes'), f('migration-note.ts', 'migration notes'), f('renderer.ts', 'render changelog'),
    f('feed.ts', 'changelog feed'), f('store.ts', 'changelog store'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'postman-gen') return [
    f('collection.ts', 'postman collection model'), f('generator.ts', 'generate collection from OpenAPI'), f('request.ts', 'collection request'),
    f('folder.ts', 'collection folders'), f('variable.ts', 'collection variables'), f('auth.ts', 'collection auth'),
    f('example.ts', 'request examples'), f('serialize.ts', 'serialize collection'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'webhooks-sdk') return [
    f('client.ts', 'webhooks client'), f('verify.ts', 'verify signature'), f('event.ts', 'typed webhook events'),
    f('handler.ts', 'typed handler registry'), f('parser.ts', 'parse + validate payload'), f('replay-guard.ts', 'replay protection'),
    f('retry.ts', 'delivery retry view'), f('builder.ts', 'event builder'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'api-docs') return [
    f('doc.ts', 'doc model'), f('generator.ts', 'generate docs from OpenAPI'), f('markdown.ts', 'markdown renderer'),
    f('html.ts', 'html renderer'), f('reference.ts', 'API reference builder'), f('example-extractor.ts', 'extract examples'),
    f('toc.ts', 'table of contents'), f('search-index.ts', 'docs search index'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'request-signing') return [
    f('signer.ts', 'sign requests (HMAC)'), f('verifier.ts', 'verify signatures'), f('canonical.ts', 'canonical request'),
    f('nonce.ts', 'nonce management'), f('timestamp.ts', 'timestamp window'), f('key-store.ts', 'signing key store'),
    f('scheme.ts', 'signature scheme'), f('header.ts', 'signature headers'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'idempotency') return [
    f('key.ts', 'idempotency key'), f('store.ts', 'idempotency store (uses cache)'), f('record.ts', 'idempotency record'),
    f('middleware.ts', 'express idempotency middleware'), f('fingerprint.ts', 'request fingerprint'), f('lock.ts', 'in-flight lock'),
    f('replay.ts', 'replay cached response'), f('policy.ts', 'idempotency policy'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'developer-portal-api') return [
    f('main.ts', 'dev portal api entrypoint'), f('app.ts', 'build app'), f('router.ts', 'mount routes'),
    f('routes/apps.routes.ts', 'apps'), f('routes/keys.routes.ts', 'keys'), f('routes/usage.routes.ts', 'usage'),
    f('controllers/apps.controller.ts', 'apps ctrl'), f('controllers/keys.controller.ts', 'keys ctrl'), f('controllers/usage.controller.ts', 'usage ctrl'),
    f('middleware/auth.ts', 'auth'), f('middleware/error-handler.ts', 'errors'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
  if (key === 'mock-api-server') return [
    f('main.ts', 'mock api server entrypoint'), f('app.ts', 'build app from mock-server defs'), f('router.ts', 'dynamic mock routes'),
    f('seed.ts', 'seed mock data'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
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
