# AGENTS.md

Notes for AI agents working in this repository. Read this before editing anything.

This is the **Veritas** monorepo (`/Users/arhansubasi/croo/veritas`): a production
fact-verification & source-provenance platform that exposes a verification engine
three ways — (a) a paid **CAP** agent (CROO Agent Protocol, settles USDC on Base),
(b) a **REST API**, and (c) a **TypeScript client SDK**.

It is a single-`tsconfig` TypeScript ESM monorepo (Node 18+, strict) with
**126 packages** under `packages/*` and **23 apps** under `apps/*` (~2,460 `.ts` files).

---

## ⚠️ Read this first — common traps

1. **`README.md` describes a stale/legacy layout.** It documents a flat `src/` app with
   `npm start`, `npm test`, `npm run verify:local`, `npm run requester`, and "22 vitest
   tests". **None of those scripts exist in the current `package.json`** — they belong to
   the code now living in `legacy/`. For the real architecture read **`README.platform.md`**.
   Treat `README.md` as historical context about the verification engine's *behavior*, not
   its current *commands or layout*.

2. **`npm run typecheck` does NOT currently pass.** As of this writing there are ~94 type
   errors concentrated in newer "wave"-generated packages (e.g. `tax`, `waitlist`). Don't
   assume a clean baseline, and don't treat a pre-existing error as something you caused.
   See [Fixing type errors](#fixing-type-errors) for the canonical repair loop.

3. **There are no tests — by design.** The build spec mandates "NEVER write tests,
   `*.test.ts`, or `__tests__`". `legacy/test/*` is the only test code and is excluded.
   Do **not** add a test runner, `npm test`, or test files. Verify changes with
   `tsc --noEmit` (your module's slice) instead.

4. **Per-package `package.json` files declare no dependencies.** They contain only
   `name`/`version`/`type`/`main`/`types` (all pointing at `src/index.ts`). Cross-package
   resolution happens entirely through `tsconfig.json` path aliases at compile time and
   `tsx` at runtime — so **`npm install` only installs the handful of root deps**
   (`@anthropic-ai/sdk`, `@croo-network/sdk`, `zod`, `express`, `pino`, `nanoid`, `dotenv`).
   Do not try to "fix" a missing dependency by adding it to a package's `package.json`.

5. **The `.workflows/` directory is how this repo was built.** `build-platform.mjs`,
   `wave3..10-platform.mjs`, `expand-platform.mjs`, `fix-types.mjs` are *agent-orchestration
   scripts* that fan out sub-agents to generate/fix packages in waves. They are not
   application runtime code, but they are the **authoritative source of the coding
   conventions** — the `ARCH`/`RULES` strings in `build-platform.mjs` and `fix-types.mjs`
   are the spec every file was written against. Re-read them when unsure of a convention.

---

## Essential commands

All run from the repo root (`/Users/arhansubasi/croo/veritas`).

```bash
npm install                # installs only the small set of root deps
npm run typecheck          # tsc -p tsconfig.json --noEmit  (whole program; currently has ~94 errors — see below)
npm run build              # tsc -p tsconfig.json            (emit; note tsconfig has noEmit:true, so this is effectively a compile check)

# Run an app (each is a thin entrypoint over the shared container):
npm run api                # apps/api          — REST API (express)
npm run worker             # apps/worker        — background job worker
npm run agent              # apps/cap-agent     — paid CAP agent (USDC on Base)
npm run admin              # apps/admin-api
npm run graphql            # apps/graphql
npm run cli                # apps/cli
npm run scheduler          # apps/scheduler-app
npm run bff                # apps/bff
npm run public-api         # apps/public-api
npm run orchestrator       # apps/agent-orchestrator
npm run metrics            # apps/metrics-exporter
npm run webhook-gateway    # apps/webhook-gateway
npm run attestation-publisher
npm run ingestion-worker
npm run plugin-host
```

Apps have no build step — entrypoints are run directly via `tsx` against the TS sources.
Several apps in `apps/` are **not** wired into `package.json` scripts
(`auth-server`, `billing-api`, `domain-router`, `growth-api`, `ops-api`, `privacy-api`,
`quality-monitor`, `status-page`); run those with `tsx apps/<name>/src/main.ts`.

Runtime requires `.env` (copy `.env.example`): `CROO_API_URL`, `CROO_WS_URL`,
`CROO_SDK_KEY`, `ANTHROPIC_API_KEY`, plus optional `VERITAS_*` tuning knobs.

---

## Architecture & control flow

### Layered package dependency graph

Packages form a strict layered DAG (defined in `build-platform.mjs` `PACKAGES` and mirrored
in `tsconfig.json` `paths`). Higher layers depend downward; never import upward.

```
core                         Result/Option, AppError tree, IDs, Page, Money, Clock, hashing, retry, schemas
 └ contracts                 zod schemas + inferred TS types for every boundary
    └ observability · config logging/metrics/tracing; env→AppConfig (fail-fast zod)
       └ auth · persistence  API keys/principals; repository abstractions
          └ llm             VerifierLLM seam (Anthropic provider + MockProvider)
             └ verification the fact-verification engine (the product)
                └ cap        CROO Agent Protocol integration (Negotiate→Lock→Deliver→Clear)
                └ billing    usage metering + USDC settlement
                └ webhooks · notifications · agent-store …  (many domain packages)
                   └ services application-service orchestration over repositories
                      └ container  dependency-injection composition root
                         └ apps/*   entrypoints (api, worker, cap-agent, …)
```

`@veritas/sdk` (client SDK) sits off `core`+`contracts` and is the public surface other
agents/users call.

### Composition root & dependency injection

Everything is wired through a tiny hand-rolled DI container in `@veritas/container`
(`packages/container/src/container.ts`). The API is:

- `c.value(TOKEN, instance)` — register an already-constructed singleton.
- `c.singleton(TOKEN, factory)` — lazy singleton (factory called once, cached). **Default
  for nearly all bindings.**
- `c.transient(TOKEN, factory)` — new instance per `resolve`.
- `c.resolve(TOKEN) / c.tryResolve(TOKEN) / c.has(TOKEN)`.

Bindings are keyed by **`Token<T>` symbols** exported as `TOKENS`/named constants from
`packages/container/src/tokens.ts` (e.g. `CONFIG`, `LOGGER`, `METRICS`, `REPORT_REPO`,
`VERIFICATION_JOB_SVC`, `LLM_PROVIDER`, …). `buildContainer({ config })`
(`packages/container/src/build-container.ts`) constructs the fully-wired container, with
per-domain modules in `packages/container/src/modules/` (`persistence.module.ts`,
`services.module.ts`, …).

**Gotcha:** the default `LLM_PROVIDER` binding is `MockProvider`, not the real Anthropic
client — real deployments must override the binding after `buildContainer`. Keep this in
mind if a verification call returns canned data.

### App bootstrap pattern

Every app entrypoint follows the same shape (see `apps/api/src/main.ts`):

```ts
const config = loadConfig();                 // @veritas/config — fail-fast env validation
const container = buildContainer({ config }); // @veritas/container — composition root
const app = buildApp(container, config);     // express app, injects container into routes
await startServer(server, config.server.port ?? 3000);
main().catch((e) => { console.error("Fatal", e); process.exit(1); });
```

REST routing lives in `apps/api/src/router.ts`, which mounts per-domain routers under a
versioned prefix. Each `routes/*.routes.ts` factory takes `(container, config)` and
resolves the services it needs by token. Controllers → application services
(`@veritas/services`) → repositories (`@veritas/persistence`).

### The verification engine

`@veritas/verification` is the product. `runVerification` (`packages/verification/src/engine.ts`)
orchestrates a composable **pipeline of stages** (`packages/verification/src/pipeline/`):
`normalize → resolve-claims → dedupe-claims → (research per claim) → score → assemble`.
Each stage is wrapped to return a `Result` rather than throw; per-claim failures are
isolated (one bad claim never fails the job). Output is a `VerificationReport`
(`veritas.report.v1`) with a reproducible `contentHash` computed over canonicalised
`{ request, claims }` (timestamp deliberately excluded so identical evidence → identical hash).

The **two-phase verification** design (from `README.md`, still accurate behaviorally): each
claim is first *researched* with Claude's server-side `web_search`, then *adjudicated* with a
strict structured-output call. A verdict with no citation is auto-downgraded to `UNVERIFIABLE`.

### CAP lifecycle (`@veritas/cap`)

Negotiate → Lock → Deliver → Clear. Requirements are Zod-validated at `NegotiationCreated`
**before** any USDC enters escrow. Verification only runs after `OrderPaid`; the report is
delivered via `deliverOrder(...)` which returns a `contentHash` + `txHash` that must match the
locally-computed provenance hash. The provider is crash-resilient: after a restart it
reconstructs the request from the order/negotiation via the API.

---

## Code conventions (the rules every file was written to)

From `build-platform.mjs` `ARCH` and `fix-types.mjs` `RULES`:

- **TypeScript ESM, strict, `noUncheckedIndexedAccess: true`.** Target ES2022, `moduleResolution: Bundler`.
- **Cross-package imports use the alias form:** `import { Result } from "@veritas/core"`.
  **Intra-package imports are RELATIVE WITH the `.js` extension:**
  `import { x } from "./x.js"`, `import { y } from "./sub/y.js"`. (ESM requires the extension;
  forgetting it or using a bare alias inside a package is a common error.)
- **`noUncheckedIndexedAccess`** means `arr[i]` is `T | undefined` — narrow before use; this
  surfaces as many real TS errors.
- **No `any` unless unavoidable; prefer `unknown` + narrowing.** Immutable data — return new
  objects, use `readonly` fields.
- **One-line top-of-file comment** describing the file's purpose (every file has one — match it).
- **Prefer many small, cohesive files (< ~150 lines).** Every file must be genuinely
  implemented — no `// TODO` stubs, no empty bodies.
- **Use `zod` (`import { z } from "zod"`) for runtime validation** wherever schemas are
  involved; boundaries are validated at the edge (`@veritas/contracts`).
- Match existing style quirks in the file you're editing (e.g. some files use inline
  `import { type X }`, some use default vs named exports for routers). Don't reformat.
- **Don't run `npm`/`tsc`/`git` inside sub-agent tasks** unless explicitly asked — the
  workflow scripts handle integration centrally. (For interactive work you *should* run
  `tsc --noEmit` to verify, see below.)

### Core primitives (`@veritas/core`) — use these, don't reinvent

- **`Result<T, E = unknown>`** with `ok(v)` / `err(e)` / `isOk` / `isErr` (`packages/core/src/result.ts`,
  plus `result-async.ts` for promises). **Public APIs return `Result` rather than throwing.** When
  wrapping a throw-based function, `try/catch` and convert.
- **`AppError`** (`packages/core/src/errors/base-error.ts`) is the base for all domain errors:
  constructor is `new AppError(code, status, defaultMessage, options?)`. Subclasses
  (`ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`, `UnauthorizedError`,
  `RateLimitedError`, `UnavailableError`, `InternalError`) take just `options?` and supply the
  code/status/default themselves. **Common TS2554 cause:** newer packages call e.g.
  `new NotFoundError()` with zero args — the subclass constructor still requires the options
  argument (or at least the call shape); match the real signature, don't invent one.
- IDs (`newVerificationId`, …), `Page`/pagination, `Money`, `Clock`/`epochToIso`, `canonicalize`,
  `contentHash`, `backoff`/`retry`/`timeout`, `redact`, zod helpers — all in `@veritas/core`. Check
  `packages/core/src/index.ts` before building a util.

### Contracts (`@veritas/contracts`)

Zod schemas + inferred types per entity (`packages/contracts/src/schemas/`,
`verification-request.ts`, `verification-report.ts`, `api-envelope.ts`). Validate at boundaries;
infer types with `z.infer<typeof XSchema>`. If you need a shared type/schema, add it here rather
than duplicating it in a package.

---

## Fixing type errors

The repo's typecheck baseline is **not** clean. The canonical repair process is codified in
`.workflows/fix-types.mjs` — follow its rules when fixing types:

- **Edit ONLY files inside your target module directory.** Never edit another package/app to
  silence an error.
- **For `no exported member X` / `did you mean Y` (TS2305/TS2724) against another `@veritas/*`
  package:** do NOT add exports to that dependency. Instead **read its `src/index.ts`** to find
  the real exported name and fix YOUR import (rename / pick the correct symbol).
- **For missing members within your OWN module:** you MAY add the needed export/field to the
  sibling file that should provide it.
- **TS2554 (wrong arg count):** match the real constructor/function signature — see the
  `AppError` note above, a frequent offender.
- **TS7006 (implicit any):** add explicit types. **TS18046 (object of unknown type):** narrow.
  **TS2339 (property):** use the correct property/type.
- **Never weaken with `any`** unless genuinely unavoidable; keep behavior intact; don't delete
  functionality to silence errors.

Quick local check while editing (faster than the whole-program run):

```bash
npx tsc -p tsconfig.json --noEmit 2>&1 | grep "packages/<your-pkg>"
```

Count remaining errors repo-wide:

```bash
npx tsc -p tsconfig.json --noEmit 2>&1 | grep -c "error TS"
```

Per-module distribution (where the errors cluster):

```bash
npx tsc -p tsconfig.json --noEmit 2>&1 | grep "error TS" \
  | grep -oE "^(packages|apps|examples)/[^/]+" | sort | uniq -c | sort -rn | head -30
```

---

## Things that exist but you can usually ignore

- **`legacy/`** — the original flat single-app codebase (`src/`, `test/`, `examples/`),
  excluded by `tsconfig.json`. Source of the now-stale `README.md`. Don't edit unless porting.
- **`examples/src/`** — example apps (e.g. the buyer-agent `requester` referenced by the old
  README). Included in the tsconfig `include`.
- **The many domain packages** (`tax`, `waitlist`, `marketplace`, `nps`, `segmentation`, …)
  are platform-expansion features added by the wave scripts and are largely independent;
  treat each as its own bounded module following the conventions above.

---

## Quick orientation checklist

1. Unsure of an export name? Read the package's `packages/<pkg>/src/index.ts`.
2. Unsure of a constructor signature? Read the base in `@veritas/core` (errors) or the contracts.
3. Edit produced a new TS error only in other packages? You likely changed a contract/export —
   prefer fixing the *consumer* over widening the *producer* (see fixing rules).
4. Adding a new package/app? Register its `@veritas/<pkg>` path alias in `tsconfig.json`,
   add a minimal `package.json` (name/version/type/main/types), and respect the layered DAG.
5. Verifying? `npx tsc -p tsconfig.json --noEmit` is the source of truth — there is no test suite.
