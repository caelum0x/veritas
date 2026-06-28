export const meta = {
  name: 'veritas-fix-types',
  description: 'Repair TypeScript errors across the Veritas monorepo, one agent per module',
  phases: [
    { title: 'Fix', detail: 'per-module type-error repair' },
    { title: 'Verify', detail: 'full-repo typecheck' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'

// Module "safe" names (single underscore separates the two path segments).
// args may override with a smaller residual list on later rounds.
const DEFAULT_MODULES = [
  'apps_api', 'apps_graphql', 'packages_services', 'apps_admin-api', 'packages_persistence',
  'packages_billing', 'apps_worker', 'packages_auth', 'examples_src', 'packages_container',
  'apps_bff', 'apps_cli', 'packages_feature-flags', 'packages_event-sourcing', 'packages_agent-store',
  'packages_migrations', 'packages_messaging', 'packages_search', 'packages_llm', 'packages_observability',
  'packages_cache', 'packages_scheduler', 'packages_rbac', 'packages_cap', 'packages_webhooks',
  'packages_i18n', 'packages_gateway-core', 'packages_analytics', 'packages_verification', 'packages_tenancy',
  'packages_blockchain', 'apps_cap-agent', 'packages_sdk', 'packages_crypto', 'packages_notifications',
  'packages_email', 'packages_storage', 'packages_config', 'apps_scheduler-app', 'packages_rate-limit',
  'packages_core',
]
const MODULES = Array.isArray(args) && args.length > 0 ? args : DEFAULT_MODULES

const RULES = [
  'You are a senior TypeScript engineer repairing strict-mode type errors in the Veritas monorepo at ' + BASE + '.',
  'Conventions: ESM. Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with the .js extension.',
  'Foundation packages already exist: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError + subclasses, ids, Page, Clock, Money, canonicalize, contentHash, etc.) and @veritas/contracts (zod schemas + inferred types per entity).',
  '',
  'HARD RULES:',
  '- Edit ONLY files inside your assigned module directory. NEVER edit files in other packages/apps.',
  '- For "no exported member X" / "did you mean Y" (TS2305/TS2724) against another @veritas/* package: do NOT add exports there. Instead Read that dependency`s src/index.ts to find the REAL exported name and fix YOUR import (rename / pick the correct symbol).',
  '- For missing members within your OWN module, you MAY add the needed export/field to the sibling file that should provide it.',
  '- Fix wrong-arity calls (TS2554) by matching the real signature; fix property errors (TS2339) by using the correct property/type; add explicit types for implicit-any (TS7006); narrow unknown (TS18046).',
  '- Do NOT weaken types with `any` unless genuinely unavoidable. Keep behavior intact. Do not delete functionality to silence errors.',
  '- Do NOT run npm/tsc/git. Just Read and Edit/Write files.',
].join('\n')

phase('Fix')
log(`repairing ${MODULES.length} modules`)
const results = await parallel(
  MODULES.map((safe) => () => {
    const dir = safe.replace('_', '/')
    const prompt = [
      RULES,
      '',
      `Your module: ${BASE}/${dir}`,
      `Read the file ${'/tmp/fix/' + safe + '.txt'} — it lists this module's current tsc errors (path(line,col): error TSxxxx: message).`,
      'Work through EVERY listed error: open each referenced file, understand the error, and Edit it to fix the error properly per the rules above. Group fixes by file. When a fix depends on a sibling file in this module, read it first.',
      'After addressing all listed errors, reply with ONLY {"module":"' + dir + '","filesEdited":N}. Do not echo file contents.',
    ].join('\n')
    return agent(prompt, { label: `fix:${dir}`, phase: 'Fix', model: 'sonnet', effort: 'high' })
  }),
)
const done = results.filter(Boolean).length
log(`fix agents completed: ${done}/${MODULES.length}`)

phase('Verify')
const TSC_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    errorCount: { type: 'number' },
    topModules: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { module: { type: 'string' }, errors: { type: 'number' } },
        required: ['module', 'errors'],
      },
    },
  },
  required: ['errorCount', 'topModules'],
}
const verify = await agent(
  [
    'Typecheck the monorepo at ' + BASE + '.',
    'Run: `cd ' + BASE + ' && npx tsc -p tsconfig.json --noEmit 2>&1 > /tmp/vtsc.txt; grep -c "error TS" /tmp/vtsc.txt`.',
    'Then per-module counts: `grep -oE "^(packages|apps|examples)/[^/]+" /tmp/vtsc.txt | sort | uniq -c | sort -rn | head -30`.',
    'Also regenerate per-module error files for the next round: ',
    '`rm -rf /tmp/fix && mkdir -p /tmp/fix && grep "error TS" /tmp/vtsc.txt | while IFS= read -r l; do m=$(echo "$l" | grep -oE "^(packages|apps|examples)/[^/]+"); [ -z "$m" ] && continue; s=$(echo "$m" | tr "/" "_"); echo "$l" >> /tmp/fix/$s.txt; done`.',
    'Return errorCount and topModules (module path like "apps/api", error count). Do not edit source files.',
  ].join('\n'),
  { label: 'verify-typecheck', phase: 'Verify', schema: TSC_SCHEMA, effort: 'low' },
)
log(`typecheck after fix round: ${verify ? verify.errorCount : '?'} errors`)

return { modulesProcessed: MODULES.length, fixAgentsCompleted: done, errorCount: verify ? verify.errorCount : null, topModules: verify ? verify.topModules : [] }
