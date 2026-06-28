export const meta = {
  name: 'veritas-wave9',
  description: 'Wave 9: data platform & ML — warehouse, ETL, streaming, OLAP, lineage, feature store, scoring (~300 files)',
  phases: [
    { title: 'Scaffold', detail: 'per-module package.json' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across data modules' },
    { title: 'Integrate', detail: 'typecheck (own modules)' },
    { title: 'Fix', detail: 'own-module type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const WAVE = 'w9'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform.',
  'This workflow ADDS data-platform & ML modules to the EXISTING monorepo at ' + BASE + '. Another build may run concurrently — only write your assigned files.',
  'GLOBAL RULES:',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data.',
  '- Foundation: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Money, Clock, canonicalize), @veritas/contracts, @veritas/observability, @veritas/persistence, @veritas/analytics, @veritas/embeddings, @veritas/config.',
  '- Model warehouses, streams, ML models behind PORT INTERFACES with in-memory impls. Use ONLY installed deps (zod, express, pino, nanoid). NO new npm deps.',
  '- Do NOT edit root tsconfig.json or root package.json. Do NOT run npm/tsc/git. ONLY Write assigned files; never edit files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}.',
].join('\n')

const PACKAGES = [
  { key: 'warehouse', dir: 'packages/warehouse', deps: ['core', 'contracts'] },
  { key: 'etl', dir: 'packages/etl', deps: ['core', 'contracts', 'warehouse'] },
  { key: 'streaming', dir: 'packages/streaming', deps: ['core', 'observability'] },
  { key: 'timeseries', dir: 'packages/timeseries', deps: ['core'] },
  { key: 'olap', dir: 'packages/olap', deps: ['core', 'warehouse'] },
  { key: 'query-engine', dir: 'packages/query-engine', deps: ['core', 'warehouse'] },
  { key: 'reporting', dir: 'packages/reporting', deps: ['core', 'contracts', 'query-engine'] },
  { key: 'dashboards', dir: 'packages/dashboards', deps: ['core', 'contracts', 'query-engine'] },
  { key: 'data-catalog', dir: 'packages/data-catalog', deps: ['core', 'contracts'] },
  { key: 'lineage', dir: 'packages/lineage', deps: ['core', 'data-catalog'] },
  { key: 'data-quality', dir: 'packages/data-quality', deps: ['core', 'contracts'] },
  { key: 'feature-store', dir: 'packages/feature-store', deps: ['core', 'embeddings'] },
  { key: 'metrics-layer', dir: 'packages/metrics-layer', deps: ['core', 'query-engine'] },
  { key: 'ml-scoring', dir: 'packages/ml-scoring', deps: ['core', 'contracts', 'feature-store'] },
  { key: 'recommendations', dir: 'packages/recommendations', deps: ['core', 'contracts', 'embeddings'] },
  { key: 'data-export', dir: 'packages/data-export', deps: ['core', 'warehouse'] },
]
const APPS = [
  { key: 'analytics-api', dir: 'apps/analytics-api', deps: ['core', 'contracts', 'query-engine', 'reporting', 'dashboards', 'auth', 'observability', 'config'] },
  { key: 'reporting-worker', dir: 'apps/reporting-worker', deps: ['core', 'reporting', 'query-engine', 'observability', 'config'] },
]
const ALL = [...PACKAGES, ...APPS]

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })

function filesFor(key) {
  if (key === 'warehouse') return [
    f('warehouse.ts', 'DataWarehouse port'), f('table.ts', 'table descriptor'), f('fact-table.ts', 'fact table'),
    f('dimension.ts', 'dimension table'), f('schema.ts', 'star schema'), f('column.ts', 'column types'),
    f('partition.ts', 'partitioning'), f('memory-warehouse.ts', 'in-memory warehouse'), f('loader.ts', 'bulk loader'),
    f('query.ts', 'warehouse query'), f('catalog.ts', 'table catalog'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'etl') return [
    f('pipeline.ts', 'ETL pipeline'), f('extract.ts', 'extractor'), f('transform.ts', 'transform steps'), f('load.ts', 'loader'),
    f('source.ts', 'data source'), f('sink.ts', 'data sink'), f('mapping.ts', 'field mapping'), f('schedule.ts', 'ETL schedule'),
    f('checkpoint.ts', 'incremental checkpoint'), f('runner.ts', 'pipeline runner'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'streaming') return [
    f('stream.ts', 'data stream'), f('processor.ts', 'stream processor'), f('window.ts', 'tumbling/sliding windows'),
    f('aggregation.ts', 'windowed aggregation'), f('join.ts', 'stream join'), f('operator.ts', 'stream operators'),
    f('watermark.ts', 'watermarks'), f('state.ts', 'stream state'), f('source.ts', 'stream source'), f('sink.ts', 'stream sink'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'timeseries') return [
    f('series.ts', 'time series'), f('point.ts', 'data point'), f('store.ts', 'timeseries store'),
    f('downsample.ts', 'downsampling'), f('rollup.ts', 'rollups'), f('aggregate.ts', 'aggregation functions'),
    f('retention.ts', 'retention'), f('interpolate.ts', 'gap interpolation'), f('query.ts', 'range query'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'olap') return [
    f('cube.ts', 'OLAP cube'), f('measure.ts', 'measures'), f('dimension.ts', 'cube dimensions'),
    f('aggregation.ts', 'pre-aggregation'), f('drill.ts', 'drill down/up'), f('slice.ts', 'slice/dice'),
    f('pivot.ts', 'pivot'), f('rollup.ts', 'rollup'), f('query.ts', 'MDX-lite query'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'query-engine') return [
    f('query.ts', 'query AST'), f('parser.ts', 'query parser'), f('planner.ts', 'query planner'), f('executor.ts', 'executor'),
    f('optimizer.ts', 'query optimizer'), f('predicate.ts', 'predicates'), f('projection.ts', 'projections'), f('join.ts', 'joins'),
    f('aggregate.ts', 'aggregations'), f('sort.ts', 'sort/limit'), f('result-set.ts', 'result set'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'reporting') return [
    f('report.ts', 'report definition'), f('builder.ts', 'report builder'), f('renderer.ts', 'render report'),
    f('schedule.ts', 'report schedule'), f('delivery.ts', 'deliver reports'), f('parameter.ts', 'report parameters'),
    f('template.ts', 'report template'), f('section.ts', 'report sections'), f('chart.ts', 'chart specs'),
    f('export.ts', 'export formats'), f('store.ts', 'report store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'dashboards') return [
    f('dashboard.ts', 'dashboard def'), f('widget.ts', 'widgets'), f('layout.ts', 'grid layout'),
    f('query-binding.ts', 'bind widget->query'), f('filter.ts', 'dashboard filters'), f('refresh.ts', 'refresh policy'),
    f('snapshot.ts', 'dashboard snapshot'), f('share.ts', 'sharing'), f('store.ts', 'dashboard store'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'data-catalog') return [
    f('dataset.ts', 'dataset'), f('schema.ts', 'dataset schema'), f('catalog.ts', 'catalog'),
    f('tag.ts', 'tags'), f('owner.ts', 'ownership'), f('search.ts', 'catalog search'), f('glossary.ts', 'business glossary'),
    f('registry.ts', 'dataset registry'), f('store.ts', 'catalog store'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'lineage') return [
    f('node.ts', 'lineage node'), f('edge.ts', 'lineage edge'), f('graph.ts', 'lineage graph'),
    f('tracker.ts', 'track lineage'), f('upstream.ts', 'upstream resolution'), f('downstream.ts', 'downstream impact'),
    f('column-lineage.ts', 'column-level lineage'), f('query.ts', 'lineage query'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'data-quality') return [
    f('check.ts', 'quality check'), f('rule.ts', 'quality rule'), f('profiler.ts', 'data profiling'),
    f('completeness.ts', 'completeness'), f('uniqueness.ts', 'uniqueness'), f('validity.ts', 'validity'),
    f('freshness.ts', 'freshness'), f('anomaly.ts', 'anomaly detection'), f('report.ts', 'quality report'),
    f('scorecard.ts', 'quality scorecard'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'feature-store') return [
    f('feature.ts', 'feature definition'), f('feature-set.ts', 'feature set'), f('store.ts', 'feature store port'),
    f('online-store.ts', 'online serving'), f('offline-store.ts', 'offline/training'), f('registry.ts', 'feature registry'),
    f('transform.ts', 'feature transforms'), f('materialize.ts', 'materialization'), f('vector-feature.ts', 'embedding features'),
    f('point-in-time.ts', 'point-in-time join'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'metrics-layer') return [
    f('metric.ts', 'semantic metric'), f('dimension.ts', 'metric dimensions'), f('definition.ts', 'metric definition'),
    f('compiler.ts', 'compile metric->query'), f('registry.ts', 'metric registry'), f('aggregation.ts', 'aggregation rules'),
    f('time-grain.ts', 'time grain'), f('derived.ts', 'derived metrics'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'ml-scoring') return [
    f('model.ts', 'Model port'), f('scorer.ts', 'scorer'), f('feature-vector.ts', 'feature vector'),
    f('trust-model.ts', 'trust-score model'), f('risk-model.ts', 'risk-score model'), f('source-credibility-model.ts', 'source credibility'),
    f('logistic.ts', 'logistic regression scorer'), f('ensemble.ts', 'ensemble'), f('registry.ts', 'model registry'),
    f('explain.ts', 'feature importance'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'recommendations') return [
    f('recommender.ts', 'Recommender port'), f('item.ts', 'recommendable item'), f('similarity.ts', 'item similarity'),
    f('collaborative.ts', 'collaborative filtering'), f('content-based.ts', 'content-based'), f('ranking.ts', 'rank candidates'),
    f('agent-recommender.ts', 'recommend verifier agents'), f('source-recommender.ts', 'recommend sources'),
    f('feedback.ts', 'feedback loop'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'data-export') return [
    f('exporter.ts', 'warehouse exporter'), f('bi-connector.ts', 'BI tool connector port'), f('parquet.ts', 'parquet format port'),
    f('csv.ts', 'csv export'), f('jsonl.ts', 'jsonl export'), f('destination.ts', 'export destinations'),
    f('schedule.ts', 'export schedule'), f('store.ts', 'export store'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'analytics-api') return [
    f('main.ts', 'analytics api entrypoint'), f('app.ts', 'build app'), f('router.ts', 'mount routes'),
    f('routes/query.routes.ts', 'query'), f('routes/reports.routes.ts', 'reports'), f('routes/dashboards.routes.ts', 'dashboards'),
    f('controllers/query.controller.ts', 'query ctrl'), f('controllers/reports.controller.ts', 'reports ctrl'), f('controllers/dashboards.controller.ts', 'dashboards ctrl'),
    f('middleware/auth.ts', 'auth'), f('middleware/error-handler.ts', 'errors'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
  if (key === 'reporting-worker') return [
    f('main.ts', 'reporting worker entrypoint'), f('worker.ts', 'run scheduled reports'), f('handler.ts', 'report job handler'),
    f('generator.ts', 'generate + deliver'), f('queue.ts', 'job queue'), f('schedule-table.ts', 'schedule table'),
    f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
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
