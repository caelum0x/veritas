export const meta = {
  name: 'veritas-wave12',
  description: 'Wave 12: AI & agent interoperability — MCP server, A2A protocol, LLM providers, prompts, guardrails, eval, model router (~250 files)',
  phases: [
    { title: 'Scaffold', detail: 'per-module package.json' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across AI-interop modules' },
    { title: 'Integrate', detail: 'typecheck (own modules)' },
    { title: 'Fix', detail: 'own-module type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const WAVE = 'w12'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform; itself an AI agent on the CROO Agent Protocol.',
  'This wave makes Veritas maximally AGENT-NATIVE & interoperable. Another build may run concurrently — only write your assigned files.',
  'GLOBAL RULES:',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data. Use Result<T> from @veritas/core for fallible ops.',
  '- Foundation: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Clock, canonicalize, contentHash), @veritas/contracts, @veritas/observability, @veritas/llm (VerifierLLM provider), @veritas/verification, @veritas/config.',
  '- Model external protocols (MCP, A2A, other LLM vendors) behind PORT INTERFACES with mock/JSON impls. Anthropic stays the primary LLM. Use ONLY installed deps (zod, express, pino, nanoid, @anthropic-ai/sdk). NO new npm deps.',
  '- Do NOT edit root tsconfig.json or root package.json. Do NOT run npm/tsc/git. ONLY Write assigned files; never edit files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}.',
].join('\n')

const PACKAGES = [
  { key: 'mcp-server', dir: 'packages/mcp-server', deps: ['core', 'contracts', 'verification'] },
  { key: 'a2a-protocol', dir: 'packages/a2a-protocol', deps: ['core', 'contracts'] },
  { key: 'agent-card', dir: 'packages/agent-card', deps: ['core', 'contracts'] },
  { key: 'llm-providers', dir: 'packages/llm-providers', deps: ['core', 'llm'] },
  { key: 'model-router', dir: 'packages/model-router', deps: ['core', 'llm'] },
  { key: 'prompt-library', dir: 'packages/prompt-library', deps: ['core'] },
  { key: 'function-tools', dir: 'packages/function-tools', deps: ['core', 'contracts', 'verification'] },
  { key: 'tool-registry', dir: 'packages/tool-registry', deps: ['core'] },
  { key: 'guardrails', dir: 'packages/guardrails', deps: ['core', 'contracts'] },
  { key: 'agent-memory', dir: 'packages/agent-memory', deps: ['core', 'embeddings'] },
  { key: 'conversation', dir: 'packages/conversation', deps: ['core', 'contracts', 'llm'] },
  { key: 'context-window', dir: 'packages/context-window', deps: ['core'] },
  { key: 'eval-harness', dir: 'packages/eval-harness', deps: ['core', 'contracts', 'verification'] },
  { key: 'skills', dir: 'packages/skills', deps: ['core'] },
  { key: 'citations-llm', dir: 'packages/citations-llm', deps: ['core', 'contracts'] },
  { key: 'streaming-llm', dir: 'packages/streaming-llm', deps: ['core'] },
]
const APPS = [
  { key: 'mcp-server-app', dir: 'apps/mcp-server-app', deps: ['core', 'mcp-server', 'verification', 'observability', 'config'] },
  { key: 'agent-gateway', dir: 'apps/agent-gateway', deps: ['core', 'contracts', 'a2a-protocol', 'agent-card', 'verification', 'observability', 'config'] },
]
const ALL = [...PACKAGES, ...APPS]

const f = (p, d) => ({ p, d })

function filesFor(key) {
  if (key === 'mcp-server') return [
    f('server.ts', 'MCP server core'), f('protocol.ts', 'MCP JSON-RPC protocol types'), f('transport.ts', 'transport port (stdio/http)'),
    f('tool.ts', 'MCP tool definition'), f('tools/verify-claims.tool.ts', 'verify_claims MCP tool'), f('tools/verify-text.tool.ts', 'verify_text MCP tool'),
    f('tools/get-report.tool.ts', 'get_report MCP tool'), f('resource.ts', 'MCP resource'), f('resources/reports.resource.ts', 'reports resource'),
    f('prompt.ts', 'MCP prompt'), f('prompts/fact-check.prompt.ts', 'fact-check prompt'), f('registry.ts', 'tool/resource registry'),
    f('handler.ts', 'request handler'), f('capabilities.ts', 'server capabilities'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'a2a-protocol') return [
    f('agent-card.ts', 'A2A agent card'), f('message.ts', 'A2A message'), f('task.ts', 'A2A task'), f('artifact.ts', 'A2A artifact'),
    f('discovery.ts', 'agent discovery'), f('client.ts', 'A2A client port'), f('server.ts', 'A2A server handler'),
    f('skill.ts', 'advertised skills'), f('negotiation.ts', 'capability negotiation'), f('transport.ts', 'transport port'),
    f('cap-bridge.ts', 'bridge A2A <-> CROO CAP'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'agent-card') return [
    f('card.ts', 'agent capability card'), f('capability.ts', 'capabilities'), f('skill.ts', 'skill descriptor'),
    f('endpoint.ts', 'endpoints'), f('authentication.ts', 'auth schemes'), f('pricing.ts', 'pricing info'),
    f('builder.ts', 'build Veritas agent card'), f('publish.ts', 'publish card'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'llm-providers') return [
    f('provider-adapter.ts', 'adapt vendor SDK -> VerifierLLM'), f('openai-compat.ts', 'OpenAI-compatible port'), f('bedrock-port.ts', 'Bedrock port'),
    f('vertex-port.ts', 'Vertex port'), f('local-port.ts', 'local model port'), f('mock-llm.ts', 'mock llm'),
    f('registry.ts', 'provider registry'), f('failover.ts', 'provider failover'), f('cost-table.ts', 'per-provider cost'),
    f('capabilities.ts', 'provider capabilities'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'model-router') return [
    f('router.ts', 'route task -> model'), f('policy.ts', 'routing policy'), f('task-profile.ts', 'task profiles'),
    f('cost-aware.ts', 'cost-aware routing'), f('quality-aware.ts', 'quality-aware routing'), f('fallback-chain.ts', 'fallback chain'),
    f('selector.ts', 'model selector'), f('registry.ts', 'model registry'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'prompt-library') return [
    f('prompt.ts', 'prompt template'), f('registry.ts', 'prompt registry'), f('version.ts', 'prompt versioning'),
    f('render.ts', 'render with variables'), f('partials.ts', 'reusable partials'), f('library/verification.ts', 'verification prompts'),
    f('library/extraction.ts', 'extraction prompts'), f('library/adjudication.ts', 'adjudication prompts'), f('library/summarization.ts', 'summary prompts'),
    f('evaluation.ts', 'prompt eval metadata'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'function-tools') return [
    f('tool.ts', 'function tool definition (name, schema, handler)'), f('schema.ts', 'JSON schema from zod'), f('registry.ts', 'tool registry'),
    f('tools/verify.ts', 'verify function tool'), f('tools/search-sources.ts', 'search-sources tool'), f('tools/get-trust-score.ts', 'trust-score tool'),
    f('dispatcher.ts', 'dispatch tool calls'), f('result.ts', 'tool result'), f('anthropic-format.ts', 'format for Anthropic tool use'),
    f('openai-format.ts', 'format for OpenAI functions'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'tool-registry') return [
    f('registry.ts', 'central tool registry'), f('descriptor.ts', 'tool descriptor'), f('category.ts', 'tool categories'),
    f('search.ts', 'search tools'), f('permission.ts', 'tool permissions'), f('versioning.ts', 'tool versions'),
    f('manifest.ts', 'tool manifest'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'guardrails') return [
    f('guardrail.ts', 'Guardrail interface'), f('pipeline.ts', 'guardrail pipeline'), f('input/prompt-injection.ts', 'prompt-injection detection'),
    f('input/jailbreak.ts', 'jailbreak detection'), f('input/pii-input.ts', 'PII in input'), f('output/hallucination.ts', 'hallucination check'),
    f('output/toxicity.ts', 'toxicity check'), f('output/schema-guard.ts', 'output schema guard'), f('output/groundedness.ts', 'groundedness check'),
    f('decision.ts', 'allow/block/redact'), f('registry.ts', 'guardrail registry'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'agent-memory') return [
    f('memory.ts', 'agent memory record'), f('store.ts', 'memory store port'), f('semantic-memory.ts', 'embedding-backed memory'),
    f('episodic.ts', 'episodic memory'), f('working-memory.ts', 'working memory'), f('retrieval.ts', 'memory retrieval'),
    f('summarize.ts', 'memory summarization'), f('forget.ts', 'decay/forget'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'conversation') return [
    f('conversation.ts', 'conversation state'), f('turn.ts', 'turn'), f('manager.ts', 'conversation manager'),
    f('history.ts', 'history management'), f('role.ts', 'message roles'), f('verification-dialog.ts', 'multi-turn verification dialog'),
    f('clarification.ts', 'clarifying questions'), f('store.ts', 'conversation store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'context-window') return [
    f('budget.ts', 'token budget'), f('counter.ts', 'token counter port'), f('compactor.ts', 'context compaction'),
    f('pruner.ts', 'prune old turns'), f('window.ts', 'sliding window'), f('packer.ts', 'pack context to budget'),
    f('priority.ts', 'content priority'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'eval-harness') return [
    f('dataset.ts', 'eval dataset (cases)'), f('case.ts', 'eval case'), f('runner.ts', 'run evals'), f('metric.ts', 'eval metric'),
    f('metrics/accuracy.ts', 'verdict accuracy'), f('metrics/citation-precision.ts', 'citation precision'), f('metrics/calibration.ts', 'calibration metric'),
    f('scorer.ts', 'score a run'), f('report.ts', 'eval report'), f('regression.ts', 'regression detection'), f('baseline.ts', 'baseline mgmt'),
    f('store.ts', 'eval store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'skills') return [
    f('skill.ts', 'agent skill definition'), f('registry.ts', 'skill registry'), f('loader.ts', 'load skill'),
    f('manifest.ts', 'skill manifest'), f('invocation.ts', 'invoke skill'), f('library/fact-check.skill.ts', 'fact-check skill'),
    f('library/source-vet.skill.ts', 'source-vetting skill'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'citations-llm') return [
    f('extractor.ts', 'extract citations from LLM output'), f('formatter.ts', 'format citations'), f('grounding.ts', 'ground claims in sources'),
    f('span.ts', 'citation spans'), f('style.ts', 'citation styles'), f('validator.ts', 'validate citations exist'),
    f('dedupe.ts', 'dedupe citations'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'streaming-llm') return [
    f('stream.ts', 'token stream'), f('accumulator.ts', 'accumulate stream'), f('parser.ts', 'parse streamed json'),
    f('sse.ts', 'SSE framing'), f('chunk.ts', 'stream chunk'), f('handler.ts', 'stream handler'),
    f('backpressure.ts', 'backpressure'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'mcp-server-app') return [
    f('main.ts', 'MCP server entrypoint'), f('bootstrap.ts', 'wire MCP server + verification'), f('stdio.ts', 'stdio transport runner'),
    f('http.ts', 'http transport runner'), f('register-tools.ts', 'register Veritas MCP tools'), f('config.ts', 'config'),
    f('health.ts', 'health'), f('index.ts', 're-export')]
  if (key === 'agent-gateway') return [
    f('main.ts', 'agent gateway entrypoint'), f('app.ts', 'build app'), f('a2a-endpoint.ts', 'A2A endpoint'),
    f('card-endpoint.ts', 'serve agent card'), f('task-handler.ts', 'handle A2A tasks via verification'), f('cap-bridge.ts', 'bridge to CAP provider'),
    f('discovery-endpoint.ts', 'discovery endpoint'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('errors.ts', 'errors'), f('index.ts', 're-export')]
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
const CHEAT = ['SHARED FOUNDATION (import, do not redefine):', '@veritas/core exports: ' + ((disc && disc.core) || []).join(', '), '@veritas/contracts exports: ' + ((disc && disc.contracts) || []).join(', '), 'Cross-package import alias @veritas/<pkg>; within-package relative imports use .js. For other deps, READ their src/index.ts to confirm exact export names.'].join('\n')

phase('Implement')
log(`fanning out ${units.length} units covering ${totalFiles} new files across ${ALL.length} modules`)
function implPrompt(u) {
  const fileList = u.allFiles.map((x) => `  - src/${x.p} : ${x.d}`).join('\n')
  const assigned = u.assigned.map((x) => `${BASE}/${u.pkg.dir}/src/${x.p}`).join('\n')
  const depAliases = (u.pkg.deps || []).map((d) => '@veritas/' + d).join(', ')
  return [ARCH, '', CHEAT, '', `You implement part of @veritas/${u.pkg.key} (dir ${u.pkg.dir}). May import from: ${depAliases}. Read a dependency's src/index.ts before importing its symbols.`,
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
