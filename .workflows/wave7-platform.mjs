export const meta = {
  name: 'veritas-wave7',
  description: 'Wave 7: governance, security & compliance — SSO/MFA, DLP, GDPR, SOC2, secrets, encryption (~300 files)',
  phases: [
    { title: 'Scaffold', detail: 'per-module package.json' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across governance modules' },
    { title: 'Integrate', detail: 'typecheck (own modules)' },
    { title: 'Fix', detail: 'own-module type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const WAVE = 'w7'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform.',
  'This workflow ADDS governance/security/compliance modules to the EXISTING monorepo at ' + BASE + '. Another build may run concurrently — only write your assigned files.',
  'GLOBAL RULES:',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data.',
  '- Foundation: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Clock, canonicalize, contentHash), @veritas/contracts, @veritas/observability, @veritas/auth, @veritas/crypto, @veritas/persistence, @veritas/config.',
  '- Model external IdPs, KMS, SIEM behind PORT INTERFACES with mock impls. Use ONLY installed deps (zod, express, pino, nanoid). NO new npm deps.',
  '- Do NOT edit root tsconfig.json or root package.json. Do NOT run npm/tsc/git. ONLY Write assigned files; never edit files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}.',
].join('\n')

const PACKAGES = [
  { key: 'sso', dir: 'packages/sso', deps: ['core', 'auth', 'crypto'] },
  { key: 'mfa', dir: 'packages/mfa', deps: ['core', 'auth', 'crypto'] },
  { key: 'dlp', dir: 'packages/dlp', deps: ['core', 'contracts'] },
  { key: 'gdpr', dir: 'packages/gdpr', deps: ['core', 'contracts', 'persistence'] },
  { key: 'retention', dir: 'packages/retention', deps: ['core', 'persistence'] },
  { key: 'soc2', dir: 'packages/soc2', deps: ['core', 'contracts', 'observability'] },
  { key: 'secrets', dir: 'packages/secrets', deps: ['core', 'crypto'] },
  { key: 'encryption-at-rest', dir: 'packages/encryption-at-rest', deps: ['core', 'crypto'] },
  { key: 'access-review', dir: 'packages/access-review', deps: ['core', 'auth'] },
  { key: 'consent', dir: 'packages/consent', deps: ['core', 'contracts'] },
  { key: 'privacy', dir: 'packages/privacy', deps: ['core', 'contracts'] },
  { key: 'audit-export', dir: 'packages/audit-export', deps: ['core', 'observability'] },
  { key: 'compliance-reporting', dir: 'packages/compliance-reporting', deps: ['core', 'contracts', 'soc2'] },
  { key: 'threat-detection', dir: 'packages/threat-detection', deps: ['core', 'observability'] },
  { key: 'waf', dir: 'packages/waf', deps: ['core', 'observability'] },
  { key: 'data-classification', dir: 'packages/data-classification', deps: ['core', 'contracts'] },
]
const APPS = [
  { key: 'auth-server', dir: 'apps/auth-server', deps: ['core', 'contracts', 'auth', 'sso', 'mfa', 'observability', 'config'] },
  { key: 'privacy-api', dir: 'apps/privacy-api', deps: ['core', 'contracts', 'gdpr', 'consent', 'auth', 'observability', 'config'] },
]
const ALL = [...PACKAGES, ...APPS]

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })

function filesFor(key) {
  if (key === 'sso') return [
    f('provider.ts', 'IdP provider port'), f('saml/saml-provider.ts', 'SAML provider'), f('saml/assertion.ts', 'SAML assertion parse'),
    f('saml/metadata.ts', 'SAML metadata'), f('oidc/oidc-provider.ts', 'OIDC provider'), f('oidc/discovery.ts', 'OIDC discovery'),
    f('oidc/token.ts', 'OIDC token exchange'), f('oauth/oauth-provider.ts', 'OAuth2 provider'), f('session.ts', 'SSO session'),
    f('jit-provisioning.ts', 'just-in-time user provisioning'), f('attribute-mapping.ts', 'map IdP attrs->principal'),
    f('registry.ts', 'provider registry'), f('callback.ts', 'callback handler'), f('state.ts', 'oauth state/nonce'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'mfa') return [
    f('totp.ts', 'TOTP generate/verify'), f('hotp.ts', 'HOTP'), f('webauthn-port.ts', 'WebAuthn port'),
    f('recovery-codes.ts', 'recovery codes'), f('enrollment.ts', 'MFA enrollment'), f('challenge.ts', 'MFA challenge'),
    f('verifier.ts', 'verify MFA'), f('factor.ts', 'factor types'), f('policy.ts', 'MFA policy'),
    f('base32.ts', 'base32 codec'), f('qr.ts', 'otpauth URI'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'dlp') return [
    f('detector.ts', 'PII detector'), f('patterns.ts', 'PII regex patterns (email, ssn, card, phone)'), f('redactor.ts', 'redact PII'),
    f('classifier.ts', 'sensitivity classifier'), f('luhn.ts', 'card validation'), f('entropy.ts', 'secret entropy detection'),
    f('scanner.ts', 'scan payloads'), f('policy.ts', 'DLP policy'), f('finding.ts', 'DLP finding'), f('masking.ts', 'mask strategies'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'gdpr') return [
    f('dsr.ts', 'data subject request'), f('access-request.ts', 'right of access'), f('erasure.ts', 'right to erasure'),
    f('portability.ts', 'data portability export'), f('rectification.ts', 'rectification'), f('consent-record.ts', 'consent record'),
    f('processor.ts', 'DSR processor'), f('registry.ts', 'data inventory registry'), f('lawful-basis.ts', 'lawful basis'),
    f('workflow.ts', 'DSR workflow'), f('verification.ts', 'verify requester identity'), f('store.ts', 'DSR store'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'retention') return [
    f('policy.ts', 'retention policy'), f('schedule.ts', 'retention schedule'), f('legal-hold.ts', 'legal hold'),
    f('purge.ts', 'purge engine'), f('classifier.ts', 'classify records by policy'), f('evaluator.ts', 'evaluate expiry'),
    f('audit.ts', 'retention audit'), f('registry.ts', 'policy registry'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'soc2') return [
    f('control.ts', 'control definition'), f('catalog.ts', 'SOC2 trust-criteria catalog'), f('evidence.ts', 'control evidence'),
    f('assessment.ts', 'control assessment'), f('finding.ts', 'audit finding'), f('attestation.ts', 'control attestation'),
    f('collector.ts', 'evidence collector'), f('mapping.ts', 'map controls->frameworks'), f('status.ts', 'compliance status'),
    f('registry.ts', 'control registry'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'secrets') return [
    f('secret.ts', 'secret reference'), f('manager.ts', 'SecretsManager port'), f('memory-manager.ts', 'in-memory secrets'),
    f('rotation.ts', 'rotation policy'), f('versioning.ts', 'secret versions'), f('resolver.ts', 'resolve ${secret} refs'),
    f('vault-adapter.ts', 'vault adapter port'), f('env-adapter.ts', 'env adapter'), f('cache.ts', 'secret cache'),
    f('audit.ts', 'access audit'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'encryption-at-rest') return [
    f('envelope.ts', 'envelope encryption'), f('key-hierarchy.ts', 'KEK/DEK hierarchy'), f('field-encryption.ts', 'field-level encryption'),
    f('data-key.ts', 'data key generation'), f('cipher.ts', 'aes-gcm cipher (uses @veritas/crypto)'), f('encrypted-value.ts', 'encrypted value wrapper'),
    f('rotation.ts', 'key rotation'), f('provider.ts', 'KMS provider port'), f('searchable.ts', 'deterministic encryption for search'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'access-review') return [
    f('review.ts', 'access review campaign'), f('certification.ts', 'access certification'), f('entitlement.ts', 'entitlement'),
    f('reviewer.ts', 'reviewer assignment'), f('decision.ts', 'approve/revoke decision'), f('schedule.ts', 'periodic review'),
    f('report.ts', 'review report'), f('store.ts', 'review store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'consent') return [
    f('consent.ts', 'consent record'), f('purpose.ts', 'processing purpose'), f('terms.ts', 'terms versions'),
    f('agreement.ts', 'user agreement'), f('manager.ts', 'consent manager'), f('withdrawal.ts', 'consent withdrawal'),
    f('proof.ts', 'consent proof'), f('registry.ts', 'purpose registry'), f('store.ts', 'consent store'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'privacy') return [
    f('anonymize.ts', 'anonymization'), f('pseudonymize.ts', 'pseudonymization'), f('k-anonymity.ts', 'k-anonymity check'),
    f('differential.ts', 'differential privacy budget'), f('noise.ts', 'laplace/gaussian noise'), f('generalize.ts', 'generalization'),
    f('suppression.ts', 'suppression'), f('budget.ts', 'privacy budget tracking'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'audit-export') return [
    f('exporter.ts', 'audit exporter port'), f('siem-adapter.ts', 'SIEM adapter port'), f('cef.ts', 'CEF format'),
    f('json-lines.ts', 'JSONL export'), f('syslog.ts', 'syslog format'), f('filter.ts', 'export filters'),
    f('stream.ts', 'audit stream'), f('signer.ts', 'tamper-evident chaining'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'compliance-reporting') return [
    f('framework.ts', 'compliance frameworks (SOC2, ISO27001, GDPR)'), f('report.ts', 'compliance report'), f('generator.ts', 'report generator'),
    f('mapping.ts', 'control->requirement mapping'), f('gap-analysis.ts', 'gap analysis'), f('scorecard.ts', 'compliance scorecard'),
    f('evidence-link.ts', 'link evidence'), f('schedule.ts', 'reporting schedule'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'threat-detection') return [
    f('detector.ts', 'threat detector'), f('anomaly.ts', 'anomaly detection'), f('abuse.ts', 'abuse detection'),
    f('fraud-signal.ts', 'fraud signals'), f('velocity.ts', 'velocity checks'), f('rules.ts', 'detection rules'),
    f('score.ts', 'risk score'), f('blocklist.ts', 'dynamic blocklist'), f('event.ts', 'security event'),
    f('response.ts', 'automated response'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'waf') return [
    f('rule.ts', 'WAF rule'), f('ruleset.ts', 'managed ruleset'), f('engine.ts', 'evaluate request'),
    f('signatures.ts', 'attack signatures (sqli, xss)'), f('ip-reputation.ts', 'ip reputation'), f('rate-rule.ts', 'rate rules'),
    f('geo-rule.ts', 'geo rules'), f('decision.ts', 'allow/block/challenge'), f('middleware.ts', 'express WAF middleware'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'data-classification') return [
    f('classification.ts', 'classification levels (public/internal/confidential/restricted)'), f('classifier.ts', 'classify data'),
    f('label.ts', 'data labels'), f('policy.ts', 'handling policy per class'), f('tagger.ts', 'auto-tag fields'),
    f('inventory.ts', 'data inventory'), f('flow.ts', 'data flow mapping'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'auth-server') return [
    f('main.ts', 'auth server entrypoint'), f('app.ts', 'build app'), f('router.ts', 'mount routes'),
    f('routes/login.routes.ts', 'login'), f('routes/sso.routes.ts', 'sso callbacks'), f('routes/mfa.routes.ts', 'mfa'),
    f('controllers/login.controller.ts', 'login ctrl'), f('controllers/sso.controller.ts', 'sso ctrl'), f('controllers/mfa.controller.ts', 'mfa ctrl'),
    f('middleware/error-handler.ts', 'errors'), f('token-service.ts', 'issue tokens'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
  if (key === 'privacy-api') return [
    f('main.ts', 'privacy api entrypoint'), f('app.ts', 'build app'), f('router.ts', 'mount routes'),
    f('routes/dsr.routes.ts', 'DSR routes'), f('routes/consent.routes.ts', 'consent routes'),
    f('controllers/dsr.controller.ts', 'DSR ctrl'), f('controllers/consent.controller.ts', 'consent ctrl'),
    f('middleware/auth.ts', 'auth'), f('middleware/error-handler.ts', 'errors'), f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
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
