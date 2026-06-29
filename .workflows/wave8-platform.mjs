export const meta = {
  name: 'veritas-wave8',
  description: 'Wave 8: growth & monetization — referrals, credits, trials, campaigns, usage billing, tax, revenue (~290 files)',
  phases: [
    { title: 'Scaffold', detail: 'per-module package.json' },
    { title: 'Discover', detail: 'read foundation exports' },
    { title: 'Implement', detail: 'fan out agents across growth modules' },
    { title: 'Integrate', detail: 'typecheck (own modules)' },
    { title: 'Fix', detail: 'own-module type-error repair' },
  ],
}

const BASE = '/Users/arhansubasi/croo/veritas'
const WAVE = 'w8'
const ARCH = [
  'PROJECT: Veritas — enterprise fact-verification & source-provenance platform.',
  'This workflow ADDS growth & monetization modules to the EXISTING monorepo at ' + BASE + '. Another build may run concurrently — only write your assigned files.',
  'GLOBAL RULES:',
  '- TypeScript, ESM, Node 18+, strict. NEVER write tests/*.test.ts/__tests__.',
  '- Cross-package imports use alias @veritas/<pkg>. Within-package imports are RELATIVE with .js extension.',
  '- Real, compiling, fully-implemented code (no TODO stubs). Files < ~150 lines, one-line purpose comment.',
  '- zod for validation. Prefer unknown+narrowing over any. Immutable data.',
  '- Foundation: @veritas/core (Result<T,E=unknown>, ok/err/isOk/isErr, AppError, ids, Page, Money, Clock), @veritas/contracts, @veritas/observability, @veritas/billing, @veritas/persistence, @veritas/notifications, @veritas/auth, @veritas/config.',
  '- Model external systems (email, tax service, payment) behind PORT INTERFACES with mock impls. Use ONLY installed deps (zod, express, pino, nanoid). NO new npm deps.',
  '- Do NOT edit root tsconfig.json or root package.json. Do NOT run npm/tsc/git. ONLY Write assigned files; never edit files outside your list.',
  'OUTPUT: after writing, reply ONLY {"written":N}.',
].join('\n')

const PACKAGES = [
  { key: 'referrals', dir: 'packages/referrals', deps: ['core', 'contracts'] },
  { key: 'affiliates', dir: 'packages/affiliates', deps: ['core', 'contracts', 'billing'] },
  { key: 'credits', dir: 'packages/credits', deps: ['core', 'contracts', 'billing'] },
  { key: 'trials', dir: 'packages/trials', deps: ['core', 'contracts'] },
  { key: 'coupons', dir: 'packages/coupons', deps: ['core', 'contracts'] },
  { key: 'onboarding', dir: 'packages/onboarding', deps: ['core', 'contracts'] },
  { key: 'campaigns', dir: 'packages/campaigns', deps: ['core', 'contracts', 'notifications'] },
  { key: 'segmentation', dir: 'packages/segmentation', deps: ['core', 'contracts'] },
  { key: 'churn', dir: 'packages/churn', deps: ['core', 'contracts'] },
  { key: 'lifecycle', dir: 'packages/lifecycle', deps: ['core', 'contracts'] },
  { key: 'usage-billing', dir: 'packages/usage-billing', deps: ['core', 'contracts', 'billing'] },
  { key: 'tax', dir: 'packages/tax', deps: ['core', 'contracts'] },
  { key: 'dunning', dir: 'packages/dunning', deps: ['core', 'contracts', 'billing', 'notifications'] },
  { key: 'revenue', dir: 'packages/revenue', deps: ['core', 'contracts', 'billing'] },
  { key: 'nps', dir: 'packages/nps', deps: ['core', 'contracts'] },
  { key: 'waitlist', dir: 'packages/waitlist', deps: ['core', 'contracts'] },
]
const APPS = [
  { key: 'growth-api', dir: 'apps/growth-api', deps: ['core', 'contracts', 'referrals', 'credits', 'coupons', 'trials', 'auth', 'observability', 'config'] },
  { key: 'billing-api', dir: 'apps/billing-api', deps: ['core', 'contracts', 'billing', 'usage-billing', 'tax', 'dunning', 'auth', 'observability', 'config'] },
]
const ALL = [...PACKAGES, ...APPS]

const cap = (s) => s.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
const f = (p, d) => ({ p, d })

function filesFor(key) {
  if (key === 'referrals') return [
    f('referral.ts', 'referral record'), f('code.ts', 'referral code gen'), f('program.ts', 'referral program config'),
    f('attribution.ts', 'attribute signups'), f('reward.ts', 'reward rules'), f('redemption.ts', 'redeem rewards'),
    f('fraud-check.ts', 'self-referral fraud'), f('tracking.ts', 'track clicks/conversions'), f('store.ts', 'referral store'),
    f('service.ts', 'referral service'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'affiliates') return [
    f('affiliate.ts', 'affiliate'), f('link.ts', 'affiliate links'), f('commission.ts', 'commission calc'),
    f('tier.ts', 'commission tiers'), f('payout.ts', 'affiliate payouts'), f('attribution.ts', 'attribution window'),
    f('tracking.ts', 'click/sale tracking'), f('statement.ts', 'earnings statement'), f('store.ts', 'affiliate store'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'credits') return [
    f('credit.ts', 'credit value object'), f('balance.ts', 'credit balance'), f('grant.ts', 'grant credits'),
    f('ledger.ts', 'credit ledger'), f('expiry.ts', 'credit expiry'), f('consumption.ts', 'consume credits'),
    f('reservation.ts', 'reserve credits'), f('policy.ts', 'credit policy'), f('store.ts', 'credit store'),
    f('service.ts', 'credit service'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'trials') return [
    f('trial.ts', 'trial'), f('policy.ts', 'trial policy'), f('eligibility.ts', 'trial eligibility'),
    f('conversion.ts', 'trial conversion'), f('expiry.ts', 'trial expiry'), f('extension.ts', 'trial extension'),
    f('reminder.ts', 'expiry reminders'), f('store.ts', 'trial store'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'coupons') return [
    f('coupon.ts', 'coupon'), f('code.ts', 'coupon code'), f('rule.ts', 'redemption rules'),
    f('discount.ts', 'discount types'), f('redemption.ts', 'redeem coupon'), f('validation.ts', 'validate coupon'),
    f('limit.ts', 'usage limits'), f('campaign.ts', 'coupon campaign'), f('store.ts', 'coupon store'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'onboarding') return [
    f('flow.ts', 'onboarding flow'), f('step.ts', 'onboarding step'), f('checklist.ts', 'checklist'),
    f('progress.ts', 'track progress'), f('trigger.ts', 'step triggers'), f('completion.ts', 'completion rewards'),
    f('template.ts', 'flow templates'), f('store.ts', 'progress store'), f('service.ts', 'onboarding service'),
    f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'campaigns') return [
    f('campaign.ts', 'campaign'), f('audience.ts', 'audience'), f('message.ts', 'campaign message'),
    f('schedule.ts', 'campaign schedule'), f('trigger.ts', 'triggered campaigns'), f('send.ts', 'send via notifications'),
    f('ab-test.ts', 'campaign A/B'), f('metrics.ts', 'open/click metrics'), f('throttle.ts', 'send throttling'),
    f('store.ts', 'campaign store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'segmentation') return [
    f('segment.ts', 'segment'), f('trait.ts', 'user traits'), f('rule.ts', 'segment rules'),
    f('evaluator.ts', 'evaluate membership'), f('dynamic-segment.ts', 'dynamic segments'), f('query.ts', 'segment query'),
    f('membership.ts', 'membership store'), f('registry.ts', 'segment registry'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'churn') return [
    f('signal.ts', 'churn signals'), f('risk-score.ts', 'churn risk score'), f('predictor.ts', 'churn predictor'),
    f('features.ts', 'churn features'), f('cohort.ts', 'churn cohorts'), f('intervention.ts', 'retention intervention'),
    f('health-score.ts', 'account health'), f('store.ts', 'churn store'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'lifecycle') return [
    f('stage.ts', 'lifecycle stages'), f('transition.ts', 'stage transitions'), f('trigger.ts', 'lifecycle triggers'),
    f('event.ts', 'lifecycle events'), f('rule.ts', 'transition rules'), f('engine.ts', 'lifecycle engine'),
    f('journey.ts', 'customer journey'), f('store.ts', 'lifecycle store'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'usage-billing') return [
    f('meter.ts', 'usage meter'), f('event.ts', 'usage event'), f('aggregation.ts', 'aggregate usage'),
    f('rating.ts', 'rate usage->charges'), f('tier.ts', 'tiered/graduated pricing'), f('overage.ts', 'overage charges'),
    f('billable.ts', 'billable metric'), f('window.ts', 'billing window'), f('preview.ts', 'invoice preview'),
    f('store.ts', 'meter store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'tax') return [
    f('tax.ts', 'tax types'), f('calculator.ts', 'TaxCalculator port'), f('rate.ts', 'tax rates'),
    f('jurisdiction.ts', 'jurisdiction resolution'), f('vat.ts', 'VAT handling'), f('exemption.ts', 'tax exemptions'),
    f('mock-provider.ts', 'mock tax provider'), f('registration.ts', 'tax registration'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'dunning') return [
    f('dunning.ts', 'dunning process'), f('retry-schedule.ts', 'smart retry schedule'), f('attempt.ts', 'payment attempt'),
    f('reminder.ts', 'dunning reminders'), f('escalation.ts', 'escalation steps'), f('grace.ts', 'grace period'),
    f('recovery.ts', 'recovery tracking'), f('store.ts', 'dunning store'), f('errors.ts', 'errors'),
    f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'revenue') return [
    f('mrr.ts', 'MRR calc'), f('arr.ts', 'ARR calc'), f('cohort.ts', 'revenue cohorts'),
    f('expansion.ts', 'expansion/contraction'), f('recognition.ts', 'revenue recognition'), f('forecast.ts', 'revenue forecast'),
    f('ltv.ts', 'customer LTV'), f('cac.ts', 'CAC + payback'), f('report.ts', 'revenue report'),
    f('store.ts', 'revenue store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'nps') return [
    f('survey.ts', 'NPS survey'), f('response.ts', 'survey response'), f('score.ts', 'NPS score calc'),
    f('trigger.ts', 'survey triggers'), f('segment.ts', 'score by segment'), f('feedback.ts', 'qualitative feedback'),
    f('store.ts', 'nps store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'waitlist') return [
    f('waitlist.ts', 'waitlist'), f('entry.ts', 'waitlist entry'), f('invite.ts', 'invites'),
    f('position.ts', 'queue position'), f('referral-boost.ts', 'jump queue via referral'), f('batch-invite.ts', 'batch invites'),
    f('store.ts', 'waitlist store'), f('errors.ts', 'errors'), f('types.ts', 'types'), f('index.ts', 're-export')]
  if (key === 'growth-api') return [
    f('main.ts', 'growth api entrypoint'), f('app.ts', 'build app'), f('router.ts', 'mount routes'),
    f('routes/referrals.routes.ts', 'referrals'), f('routes/credits.routes.ts', 'credits'), f('routes/coupons.routes.ts', 'coupons'),
    f('routes/trials.routes.ts', 'trials'), f('controllers/referrals.controller.ts', 'referrals ctrl'), f('controllers/credits.controller.ts', 'credits ctrl'),
    f('controllers/coupons.controller.ts', 'coupons ctrl'), f('middleware/auth.ts', 'auth'), f('middleware/error-handler.ts', 'errors'),
    f('config.ts', 'config'), f('bootstrap.ts', 'wire'), f('index.ts', 're-export')]
  if (key === 'billing-api') return [
    f('main.ts', 'billing api entrypoint'), f('app.ts', 'build app'), f('router.ts', 'mount routes'),
    f('routes/subscriptions.routes.ts', 'subscriptions'), f('routes/invoices.routes.ts', 'invoices'), f('routes/usage.routes.ts', 'usage'),
    f('controllers/subscriptions.controller.ts', 'subs ctrl'), f('controllers/invoices.controller.ts', 'invoices ctrl'), f('controllers/usage.controller.ts', 'usage ctrl'),
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
