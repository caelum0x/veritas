export const meta = {
  name: 'veritas-wave4',
  description: 'Wave 4: on-chain & ecosystem — attestation, VC/DID, decentralized storage, plugin SDK, ingestion (~300 files)',
  phases: [
    { title: 'Scaffold', detail: 'merge new modules into root configs' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across ecosystem modules' },
    { title: 'Integrate', detail: 'install (idempotent) + typecheck' },
    { title: 'Fix', detail: 'bounded type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform (CAP agent on Base + REST/GraphQL APIs + SDK).',
  'This workflow ADDS on-chain & ecosystem modules to the EXISTING monorepo at ' + BASE + '.',
  'GLOBAL RULES (follow exactly):',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs/empty bodies). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data.',
  '- Foundation you may import: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Money, Clock, canonicalize, contentHash), @veritas/contracts, @veritas/observability, @veritas/crypto, @veritas/blockchain (EVM/Base/USDC ports), @veritas/persistence, @veritas/config.',
  '- Use ONLY deps already installed (zod, express, pino, nanoid, @anthropic-ai/sdk, @croo-network/sdk). Model external systems (IPFS, on-chain tx, OCR, oracles) behind PORT INTERFACES with in-memory/mock implementations. Do NOT add new npm dependencies.',
  '- Do NOT run npm/tsc/git unless told. ONLY Write files at the EXACT absolute paths given. Do not modify files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}. Do not echo file contents.',
].join('\n')

const PACKAGES = [
  { key: 'merkle', dir: 'packages/merkle', deps: ['core', 'crypto'] },
  { key: 'attestation', dir: 'packages/attestation', deps: ['core', 'contracts', 'crypto', 'blockchain', 'merkle'] },
  { key: 'did', dir: 'packages/did', deps: ['core', 'crypto', 'blockchain'] },
  { key: 'verifiable-credentials', dir: 'packages/verifiable-credentials', deps: ['core', 'contracts', 'crypto', 'did'] },
  { key: 'decentralized-storage', dir: 'packages/decentralized-storage', deps: ['core', 'crypto'] },
  { key: 'oracle', dir: 'packages/oracle', deps: ['core', 'blockchain'] },
  { key: 'plugin-sdk', dir: 'packages/plugin-sdk', deps: ['core', 'contracts', 'verification'] },
  { key: 'extensions', dir: 'packages/extensions', deps: ['core', 'observability'] },
  { key: 'connectors-plus', dir: 'packages/connectors-plus', deps: ['core', 'contracts', 'connectors'] },
  { key: 'importers', dir: 'packages/importers', deps: ['core', 'contracts', 'datasource'] },
  { key: 'ingestion', dir: 'packages/ingestion', deps: ['core', 'contracts'] },
  { key: 'identity', dir: 'packages/identity', deps: ['core', 'crypto', 'did'] },
  { key: 'registry-onchain', dir: 'packages/registry-onchain', deps: ['core', 'contracts', 'blockchain'] },
  { key: 'proofs', dir: 'packages/proofs', deps: ['core', 'crypto', 'merkle'] },
]
const APPS = [
  { key: 'attestation-publisher', dir: 'apps/attestation-publisher', deps: ['core', 'attestation', 'verification', 'observability', 'config'] },
  { key: 'ingestion-worker', dir: 'apps/ingestion-worker', deps: ['core', 'ingestion', 'verification', 'observability', 'config'] },
  { key: 'plugin-host', dir: 'apps/plugin-host', deps: ['core', 'plugin-sdk', 'verification', 'observability', 'config'] },
]
const ALL = [...PACKAGES, ...APPS]

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })

function filesFor(key) {
  const o = []
  if (key === 'merkle') o.push(
    f('hash.ts', 'leaf/node hashing'), f('tree.ts', 'merkle tree builder'), f('proof.ts', 'inclusion proof'),
    f('verify.ts', 'verify proof against root'), f('root.ts', 'root computation'), f('batch.ts', 'batch leaves'),
    f('sorted-pair.ts', 'sorted-pair hashing (OZ-style)'), f('serialize.ts', 'proof serialization'),
    f('multiproof.ts', 'multiproof'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'attestation') o.push(
    f('attestation.ts', 'Attestation record (report hash, schema, attester)'), f('schema.ts', 'attestation schema (EAS-like)'),
    f('registry.ts', 'AttestationRegistry port (on-chain)'), f('memory-registry.ts', 'in-memory registry'),
    f('publisher.ts', 'publish report hash on-chain'), f('anchor.ts', 'anchor merkle root of a batch'),
    f('batch-anchor.ts', 'batch multiple reports'), f('verifier.ts', 'verify an attestation'),
    f('uid.ts', 'attestation uid derivation'), f('revocation.ts', 'revoke attestations'),
    f('onchain-port.ts', 'tx submission port'), f('mock-onchain.ts', 'mock chain'), f('encoder.ts', 'encode attestation data'),
    f('record-store.ts', 'attestation store'), f('explorer.ts', 'attestation explorer links'),
    f('report-attester.ts', 'attest a VerificationReport'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'did') o.push(
    f('did.ts', 'DID parsing + types'), f('document.ts', 'DID Document'), f('resolver.ts', 'Resolver port + registry'),
    f('methods/key.ts', 'did:key'), f('methods/web.ts', 'did:web'), f('methods/pkh.ts', 'did:pkh (EVM)'),
    f('verification-method.ts', 'verification methods'), f('service.ts', 'DID service entries'),
    f('controller.ts', 'controller checks'), f('cache.ts', 'resolution cache'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'verifiable-credentials') o.push(
    f('credential.ts', 'W3C VC data model'), f('presentation.ts', 'Verifiable Presentation'), f('issuer.ts', 'issue credentials'),
    f('verifier.ts', 'verify credentials'), f('proof.ts', 'proof (JWS) port'), f('jwt.ts', 'VC-JWT encode/decode'),
    f('status-list.ts', 'revocation status list'), f('schema.ts', 'credential schema'), f('context.ts', 'JSON-LD contexts'),
    f('subject.ts', 'credential subject'), f('verification-credential.ts', 'VC for a VerificationReport'),
    f('claimset.ts', 'claim set mapping'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'decentralized-storage') o.push(
    f('cid.ts', 'content id (CIDv1-like)'), f('store.ts', 'ContentStore port'), f('memory-store.ts', 'in-memory CAS'),
    f('ipfs-adapter.ts', 'IPFS adapter (port impl)'), f('arweave-adapter.ts', 'Arweave adapter (port impl)'),
    f('gateway.ts', 'gateway url builder'), f('pin.ts', 'pinning'), f('chunker.ts', 'content chunking'),
    f('codec.ts', 'encode/decode blocks'), f('provenance-store.ts', 'store provenance artifacts'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'oracle') o.push(
    f('oracle.ts', 'Oracle port'), f('feed.ts', 'data feed'), f('price-feed.ts', 'price feed'),
    f('aggregator.ts', 'aggregate feeds'), f('chainlink-adapter.ts', 'chainlink-style adapter (port)'),
    f('mock-oracle.ts', 'mock oracle'), f('round.ts', 'feed round data'), f('staleness.ts', 'staleness checks'),
    f('registry.ts', 'feed registry'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'plugin-sdk') o.push(
    f('plugin.ts', 'VerifierPlugin interface'), f('manifest.ts', 'plugin manifest + zod schema'), f('lifecycle.ts', 'init/activate/dispose'),
    f('registry.ts', 'plugin registry'), f('loader.ts', 'load plugin module (port)'), f('capability.ts', 'declared capabilities'),
    f('context.ts', 'plugin runtime context'), f('hooks.ts', 'plugin hook points'), f('sandbox.ts', 'sandbox policy (port)'),
    f('host-api.ts', 'API exposed to plugins'), f('result.ts', 'plugin result types'), f('validation.ts', 'validate manifest'),
    f('example-plugin.ts', 'reference plugin'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'extensions') o.push(
    f('extension-point.ts', 'extension point registry'), f('hook-bus.ts', 'sync/async hook bus'), f('middleware-chain.ts', 'composable chain'),
    f('filter.ts', 'filter hooks'), f('action.ts', 'action hooks'), f('priority.ts', 'ordering by priority'),
    f('registry.ts', 'extension registry'), f('context.ts', 'extension context'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'connectors-plus') {
    o.push(f('base.ts', 'shared provider base (uses @veritas/connectors Connector)'), f('registry.ts', 'register extra providers'), f('index.ts', 're-export'))
    for (const c of ['notion', 'linear', 'telegram', 'twilio-sms', 'pagerduty', 'jira', 'asana', 'sendgrid', 'mattermost']) o.push(f(`providers/${c}.connector.ts`, `${cap(c)} connector`))
  } else if (key === 'importers') o.push(
    f('importer.ts', 'Importer port'), f('csv-importer.ts', 'csv claims importer'), f('rss-importer.ts', 'RSS/news feed importer'),
    f('sitemap-importer.ts', 'sitemap importer'), f('api-importer.ts', 'generic API importer'), f('json-importer.ts', 'json importer'),
    f('source-sync.ts', 'scheduled source sync'), f('mapping.ts', 'map external->claims'), f('dedupe.ts', 'dedupe imports'),
    f('rate-control.ts', 'polite fetching'), f('registry.ts', 'importer registry'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'ingestion') o.push(
    f('pipeline.ts', 'ingestion pipeline'), f('document.ts', 'ingested document model'), f('source-ref.ts', 'source reference'),
    f('extractors/text-extractor.ts', 'plain text'), f('extractors/html-extractor.ts', 'html->text'), f('extractors/pdf-extractor.ts', 'pdf (port)'),
    f('extractors/ocr-extractor.ts', 'OCR (port)'), f('extractors/transcript-extractor.ts', 'audio/video transcript (port)'),
    f('extractor.ts', 'Extractor port'), f('chunker.ts', 'chunk documents'), f('claim-extractor-bridge.ts', 'bridge to verification claim extraction'),
    f('normalizer.ts', 'normalize text'), f('language-detect.ts', 'language detection (port)'), f('metadata.ts', 'doc metadata'),
    f('registry.ts', 'extractor registry'), f('job.ts', 'ingestion job'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'identity') o.push(
    f('agent-identity.ts', 'agent identity (DID + keys)'), f('key-manager.ts', 'manage signing keys'), f('rotation.ts', 'key rotation'),
    f('verification.ts', 'verify agent identity'), f('challenge.ts', 'challenge-response auth'), f('proof-of-control.ts', 'prove key control'),
    f('linking.ts', 'link wallet<->agent'), f('registry.ts', 'identity registry'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'registry-onchain') o.push(
    f('agent-registry.ts', 'on-chain agent registry port'), f('service-registry.ts', 'service registry port'),
    f('reader.ts', 'read registry state'), f('writer.ts', 'write registry tx (port)'), f('record.ts', 'registry record'),
    f('mock-registry.ts', 'mock impl'), f('sync.ts', 'sync on-chain->local'), f('events.ts', 'registry events'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  else if (key === 'proofs') o.push(
    f('commitment.ts', 'commit/reveal'), f('proof-of-verification.ts', 'PoV structure over a report'), f('hash-commit.ts', 'hash commitment'),
    f('merkle-proof.ts', 'wrap @veritas/merkle proof for reports'), f('challenge.ts', 'fiat-shamir-style challenge'),
    f('transcript.ts', 'proof transcript'), f('verify.ts', 'verify proofs'), f('encode.ts', 'encode proofs'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export'))
  // apps
  else if (key === 'attestation-publisher') o.push(
    f('main.ts', 'publisher entrypoint'), f('publisher-service.ts', 'batch + anchor report hashes'), f('queue.ts', 'pending attestations queue'),
    f('scheduler.ts', 'periodic anchoring'), f('batcher.ts', 'merkle batch builder'), f('submit.ts', 'submit anchor tx (port)'),
    f('status.ts', 'track confirmations'), f('config.ts', 'config'), f('bootstrap.ts', 'wire deps'), f('index.ts', 're-export'))
  else if (key === 'ingestion-worker') o.push(
    f('main.ts', 'ingestion worker entrypoint'), f('worker.ts', 'process ingestion jobs'), f('handler.ts', 'job handler'),
    f('pipeline-runner.ts', 'run ingestion pipeline'), f('to-verification.ts', 'hand extracted claims to verification'),
    f('queue.ts', 'job queue'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export'))
  else if (key === 'plugin-host') o.push(
    f('main.ts', 'plugin host entrypoint'), f('host.ts', 'load + run verifier plugins'), f('lifecycle.ts', 'manage plugin lifecycle'),
    f('dispatch.ts', 'route claims to plugins'), f('isolation.ts', 'isolation policy'), f('host-services.ts', 'services exposed to plugins'),
    f('discovery.ts', 'discover installed plugins'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('errors.ts', 'errors'), f('index.ts', 're-export'))
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
  '1) Read ' + BASE + '/tsconfig.json; for EACH new module add compilerOptions.paths "@veritas/<short>":["<dir>/src/index.ts"] and "@veritas/<short>/*":["<dir>/src/*"]. Keep existing paths. Save valid JSON.',
  '2) Read ' + BASE + '/package.json; add scripts "attestation-publisher":"tsx apps/attestation-publisher/src/main.ts","ingestion-worker":"tsx apps/ingestion-worker/src/main.ts","plugin-host":"tsx apps/plugin-host/src/main.ts". Do NOT add new dependencies. Save valid JSON keeping existing fields.',
  '3) For EACH new module create <dir>/package.json = {"name":"@veritas/<short>","version":"1.0.0","type":"module","main":"src/index.ts","types":"src/index.ts"}.',
  'Reply only {"written":N}.',
].join('\n'), { label: 'scaffold-merge', phase: 'Scaffold', effort: 'high' })
log('scaffold merge complete')

phase('Discover')
const disc = await agent('Read ' + BASE + '/packages/core/src/index.ts and ' + BASE + '/packages/contracts/src/index.ts. Return exported identifier names from each. Do not write files.', { label: 'discover', phase: 'Discover', schema: EXPORTS_SCHEMA, effort: 'low' })
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
await agent('At ' + BASE + ': run `cd ' + BASE + ' && ([ -d node_modules/typescript ] && echo "deps present" || npm install)`. Idempotent. One line outcome. Do not edit source.', { label: 'install', phase: 'Integrate', effort: 'low' })
const tscPrompt = [
  'Typecheck at ' + BASE + '. Run `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 > /tmp/vtsc.txt; grep -c "error TS" /tmp/vtsc.txt`;',
  'per-module: `grep -oE "^(packages|apps|examples)/[^/]+" /tmp/vtsc.txt | sort | uniq -c | sort -rn | head -50`;',
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
      'Repair strict TypeScript errors in module ' + BASE + '/' + t.module + ' (ONLY this module\'s files).',
      'Read /tmp/fix/' + safe + '.txt for this module\'s tsc errors. Fix every listed error properly. ' +
      'For "no exported member" against another @veritas/* pkg, Read that pkg\'s src/index.ts and fix YOUR import name; never edit other modules. No `any` unless unavoidable. Reply only {"fixed":true}.',
    ].join('\n'), { label: `fix:${t.module}`, phase: 'Fix', model: 'sonnet', effort: 'high' })
  }))
  const tsc2 = await agent(tscPrompt, { label: 'typecheck-2', phase: 'Fix', schema: TSC_SCHEMA, effort: 'low' })
  last = tsc2 ? tsc2.errorCount : last
  log(`typecheck after fix: ${last} errors`)
}

return { newModules: ALL.length, unitsDispatched: units.length, filesPlanned: totalFiles, implAgentsCompleted: implDone, tscErrorsInitial: tsc1 ? tsc1.errorCount : null, tscErrorsFinal: last }
