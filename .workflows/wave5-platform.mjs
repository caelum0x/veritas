export const meta = {
  name: 'veritas-wave5',
  description: 'Wave 5: domain intelligence & quality — specialized verifiers, contradiction/bias, citation graph (~310 files)',
  phases: [
    { title: 'Scaffold', detail: 'merge new modules into root configs' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across intelligence modules' },
    { title: 'Integrate', detail: 'install (idempotent) + typecheck' },
    { title: 'Fix', detail: 'bounded type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform.',
  'This workflow ADDS domain-intelligence & quality modules to the EXISTING monorepo at ' + BASE + '.',
  'GLOBAL RULES (follow exactly):',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs/empty bodies). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data.',
  '- Foundation you may import: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Money, Clock, canonicalize, contentHash), @veritas/contracts, @veritas/observability, @veritas/llm (VerifierLLM provider), @veritas/verification, @veritas/datasource, @veritas/embeddings, @veritas/knowledge.',
  '- Domain verifiers must model external data sources (EDGAR, PubMed, on-chain, news APIs) behind PORT INTERFACES with mock implementations. Use ONLY installed deps (zod, express, pino, nanoid, @anthropic-ai/sdk, @croo-network/sdk). Do NOT add new npm deps.',
  '- A "specialized verifier" implements a SpecializedVerifier interface: canHandle(claim) + verify(claim, ctx) -> domain-specific evidence + verdict signals that feed the core engine.',
  '- Do NOT run npm/tsc/git unless told. ONLY Write files at the EXACT absolute paths given. Do not modify files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}. Do not echo file contents.',
].join('\n')

const PACKAGES = [
  { key: 'taxonomy', dir: 'packages/taxonomy', deps: ['core', 'contracts'] },
  { key: 'verifier-kit', dir: 'packages/verifier-kit', deps: ['core', 'contracts', 'llm', 'datasource'] },
  { key: 'verifiers-financial', dir: 'packages/verifiers-financial', deps: ['core', 'contracts', 'verifier-kit'] },
  { key: 'verifiers-scientific', dir: 'packages/verifiers-scientific', deps: ['core', 'contracts', 'verifier-kit'] },
  { key: 'verifiers-medical', dir: 'packages/verifiers-medical', deps: ['core', 'contracts', 'verifier-kit'] },
  { key: 'verifiers-news', dir: 'packages/verifiers-news', deps: ['core', 'contracts', 'verifier-kit', 'datasource'] },
  { key: 'verifiers-crypto', dir: 'packages/verifiers-crypto', deps: ['core', 'contracts', 'verifier-kit', 'blockchain'] },
  { key: 'verifiers-legal', dir: 'packages/verifiers-legal', deps: ['core', 'contracts', 'verifier-kit'] },
  { key: 'contradiction', dir: 'packages/contradiction', deps: ['core', 'contracts', 'llm'] },
  { key: 'bias-detection', dir: 'packages/bias-detection', deps: ['core', 'contracts', 'llm'] },
  { key: 'stance', dir: 'packages/stance', deps: ['core', 'contracts', 'llm'] },
  { key: 'citation-graph', dir: 'packages/citation-graph', deps: ['core', 'contracts'] },
  { key: 'multilingual', dir: 'packages/multilingual', deps: ['core', 'contracts', 'llm'] },
  { key: 'confidence-calibration', dir: 'packages/confidence-calibration', deps: ['core', 'contracts'] },
  { key: 'fact-graph', dir: 'packages/fact-graph', deps: ['core', 'contracts'] },
  { key: 'quality-gates', dir: 'packages/quality-gates', deps: ['core', 'contracts', 'verification'] },
  { key: 'corpus', dir: 'packages/corpus', deps: ['core', 'contracts', 'datasource'] },
]
const APPS = [
  { key: 'domain-router', dir: 'apps/domain-router', deps: ['core', 'contracts', 'taxonomy', 'verifier-kit', 'observability'] },
  { key: 'quality-monitor', dir: 'apps/quality-monitor', deps: ['core', 'contracts', 'quality-gates', 'analytics', 'observability'] },
]
const ALL = [...PACKAGES, ...APPS]

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })

function verifierFiles(domain, sources) {
  const o = [
    f('verifier.ts', `${cap(domain)} SpecializedVerifier (canHandle + verify)`),
    f('matcher.ts', `detect ${domain} claims`),
    f('evidence.ts', `${domain} evidence model`),
    f('signals.ts', `${domain} verdict signals`),
    f('prompts.ts', `${domain}-specific prompts`),
    f('rules.ts', `${domain} heuristics`),
    f('scoring.ts', `${domain} confidence scoring`),
    f('errors.ts', 'errors'),
    f('types.ts', 'types'),
    f('index.ts', 're-export'),
  ]
  for (const s of sources) o.push(f(`sources/${s}.ts`, `${cap(s)} data source port + mock`))
  return o
}

function filesFor(key) {
  if (key === 'taxonomy') return [
    f('claim-type.ts', 'claim type enum (statistical, causal, definitional, predictive, quote, event, comparative)'),
    f('domain.ts', 'domain enum (financial, scientific, medical, news, crypto, legal, general)'),
    f('classifier.ts', 'classify claim -> {type, domain}'), f('rules.ts', 'classification heuristics'),
    f('features.ts', 'lexical/feature extraction'), f('labels.ts', 'label sets'), f('confidence.ts', 'classification confidence'),
    f('taxonomy-tree.ts', 'hierarchical taxonomy'), f('mapper.ts', 'domain->verifier mapping'),
    f('detector.ts', 'entity/number/date detectors'), f('llm-classifier.ts', 'LLM-backed classifier port'),
    f('registry.ts', 'taxonomy registry'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'verifier-kit') return [
    f('specialized-verifier.ts', 'SpecializedVerifier interface'), f('registry.ts', 'verifier registry'),
    f('selector.ts', 'select verifiers for a claim'), f('context.ts', 'verifier context (llm, sources)'),
    f('evidence.ts', 'shared evidence model'), f('signal.ts', 'verdict signal model'), f('aggregate-signals.ts', 'combine signals'),
    f('base-verifier.ts', 'base class helpers'), f('source-port.ts', 'DataSource port'), f('mock-source.ts', 'mock source'),
    f('cache.ts', 'verifier result cache'), f('rate-control.ts', 'polite source access'), f('result.ts', 'verifier result'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'verifiers-financial') return verifierFiles('financial', ['edgar', 'ticker', 'fundamentals', 'market-data', 'filings'])
  if (key === 'verifiers-scientific') return verifierFiles('scientific', ['crossref', 'pubmed', 'doi', 'retraction', 'arxiv'])
  if (key === 'verifiers-medical') return verifierFiles('medical', ['drug-db', 'guidelines', 'icd', 'evidence-grade'])
  if (key === 'verifiers-news') return verifierFiles('news', ['outlet-registry', 'cross-source', 'recency', 'wire'])
  if (key === 'verifiers-crypto') return verifierFiles('crypto', ['tx-lookup', 'contract-verify', 'token-data', 'price-feed'])
  if (key === 'verifiers-legal') return verifierFiles('legal', ['statute', 'case-law', 'jurisdiction'])
  if (key === 'contradiction') return [
    f('detector.ts', 'detect contradictions across claims'), f('consistency-graph.ts', 'claim consistency graph'),
    f('nli-port.ts', 'natural-language-inference port'), f('llm-nli.ts', 'LLM NLI impl'), f('pair.ts', 'claim pair'),
    f('relation.ts', 'entail/contradict/neutral'), f('cluster.ts', 'cluster contradictory sets'), f('resolver.ts', 'flag/resolve'),
    f('explain.ts', 'explain contradiction'), f('scoring.ts', 'contradiction severity'), f('matrix.ts', 'pairwise matrix'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'bias-detection') return [
    f('detector.ts', 'bias/loaded-language detector'), f('lexicon.ts', 'loaded-term lexicon'), f('sentiment.ts', 'sentiment port'),
    f('framing.ts', 'framing analysis'), f('subjectivity.ts', 'subjectivity score'), f('llm-bias.ts', 'LLM bias analysis port'),
    f('source-bias.ts', 'source political/quality bias'), f('report.ts', 'bias report'), f('flags.ts', 'bias flags'),
    f('scoring.ts', 'bias scoring'), f('mitigation.ts', 'neutral-rewrite suggestions'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'stance') return [
    f('detector.ts', 'stance of source vs claim'), f('stance.ts', 'support/oppose/neutral'), f('llm-stance.ts', 'LLM stance port'),
    f('evidence-stance.ts', 'per-citation stance'), f('aggregate.ts', 'aggregate stances'), f('weighting.ts', 'weight by source authority'),
    f('disagreement.ts', 'measure disagreement'), f('scoring.ts', 'stance confidence'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'citation-graph') return [
    f('graph.ts', 'citation/evidence graph'), f('node.ts', 'source/claim node'), f('edge.ts', 'cites/supports/refutes edge'),
    f('builder.ts', 'build graph from report'), f('centrality.ts', 'source centrality'), f('diversity.ts', 'source diversity score'),
    f('cluster.ts', 'cluster sources'), f('path.ts', 'evidence paths'), f('export-dot.ts', 'graphviz export'),
    f('metrics.ts', 'graph metrics'), f('query.ts', 'graph queries'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'multilingual') return [
    f('language.ts', 'language codes'), f('detector.ts', 'language detection'), f('translator-port.ts', 'translation port'),
    f('llm-translator.ts', 'LLM translator impl'), f('cross-lingual.ts', 'cross-lingual verification'), f('normalize.ts', 'unicode normalize'),
    f('script.ts', 'script detection'), f('locale.ts', 'locale handling'), f('source-language.ts', 'match source languages'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'confidence-calibration') return [
    f('calibrator.ts', 'Calibrator interface'), f('platt.ts', 'platt scaling'), f('isotonic.ts', 'isotonic regression'),
    f('temperature.ts', 'temperature scaling'), f('reliability.ts', 'reliability diagram data'), f('brier.ts', 'brier score'),
    f('ece.ts', 'expected calibration error'), f('ensemble.ts', 'ensemble combine'), f('histogram.ts', 'confidence histogram'),
    f('store.ts', 'calibration data store'), f('apply.ts', 'apply calibration to verdicts'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'fact-graph') return [
    f('entity.ts', 'entity node'), f('relation.ts', 'relation edge'), f('triple.ts', 'subject-predicate-object'),
    f('extractor.ts', 'extract entities/relations from claims (LLM port)'), f('graph.ts', 'fact graph'), f('merge.ts', 'merge/dedupe entities'),
    f('linker.ts', 'entity linking'), f('query.ts', 'graph query'), f('inference.ts', 'simple inference rules'),
    f('contradiction-link.ts', 'tie to contradiction detection'), f('store.ts', 'graph store'), f('export.ts', 'export graph'),
    f('canonical-entity.ts', 'canonicalize entities'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'quality-gates') return [
    f('gate.ts', 'QualityGate interface'), f('pipeline.ts', 'run gates in order'), f('gates/citation-coverage.ts', 'every claim cited'),
    f('gates/schema-conformance.ts', 'report matches schema'), f('gates/hallucination-guard.ts', 'citations exist in evidence'),
    f('gates/confidence-sanity.ts', 'confidence vs verdict sanity'), f('gates/source-diversity.ts', 'min source diversity'),
    f('gates/freshness.ts', 'evidence recency'), f('gates/contradiction-free.ts', 'no internal contradictions'),
    f('result.ts', 'gate result'), f('severity.ts', 'severity levels'), f('report.ts', 'quality report'), f('registry.ts', 'gate registry'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'corpus') return [
    f('corpus.ts', 'trusted source corpus'), f('snapshot.ts', 'corpus snapshot/versioning'), f('record.ts', 'corpus record'),
    f('builder.ts', 'build corpus'), f('importer.ts', 'import sources into corpus'), f('search.ts', 'corpus search'),
    f('authority.ts', 'authority weighting'), f('curation.ts', 'curate/review'), f('diff.ts', 'snapshot diff'),
    f('store.ts', 'corpus store'), f('stats.ts', 'corpus stats'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'domain-router') return [
    f('main.ts', 'domain router entrypoint'), f('router.ts', 'route claims -> specialized verifiers'), f('plan.ts', 'verification plan per claim'),
    f('dispatch.ts', 'dispatch to verifier-kit registry'), f('merge.ts', 'merge specialized signals into engine'), f('fallback.ts', 'fallback to general verifier'),
    f('weighting.ts', 'weight domain signals'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
  if (key === 'quality-monitor') return [
    f('main.ts', 'quality monitor entrypoint'), f('monitor.ts', 'track quality metrics over time'), f('collector.ts', 'collect gate results'),
    f('trends.ts', 'quality trends'), f('alerts.ts', 'alert on regressions'), f('dashboard.ts', 'quality dashboard data'),
    f('sampler.ts', 'sample reports for audit'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
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
  'Typecheck at ' + BASE + '. Run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 > /tmp/vtsc-w5.txt; grep -c "error TS" /tmp/vtsc-w5.txt`;',
  'per-module: `grep -oE "^(packages|apps|examples)/[^/]+" /tmp/vtsc-w5.txt | sort | uniq -c | sort -rn | head -60`;',
  'regenerate fix files: `rm -rf /tmp/fix-w5 && mkdir -p /tmp/fix-w5 && grep "error TS" /tmp/vtsc-w5.txt | while IFS= read -r l; do m=$(echo "$l" | grep -oE "^(packages|apps|examples)/[^/]+"); [ -z "$m" ] && continue; s=$(echo "$m" | tr "/" "_"); echo "$l" >> /tmp/fix-w5/$s.txt; done`.',
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
      'Read /tmp/fix-w5/' + safe + '.txt for this module\'s tsc errors. Fix every listed error properly. For "no exported member" against another @veritas/* pkg, Read that pkg\'s src/index.ts and fix YOUR import name; never edit other modules. No `any` unless unavoidable. Reply only {"fixed":true}.',
    ].join('\n'), { label: `fix:${t.module}`, phase: 'Fix', model: 'sonnet', effort: 'high' })
  }))
  const tsc2 = await agent(tscPrompt, { label: 'typecheck-2', phase: 'Fix', schema: TSC_SCHEMA, effort: 'low' })
  last = tsc2 ? tsc2.errorCount : last
  log(`typecheck after fix: ${last} errors`)
}

return { newModules: ALL.length, unitsDispatched: units.length, filesPlanned: totalFiles, implAgentsCompleted: implDone, tscErrorsInitial: tsc1 ? tsc1.errorCount : null, tscErrorsFinal: last }
