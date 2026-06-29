# Veritas Platform

Production fact-verification & source-provenance platform. The verification engine is
exposed three ways:

- **CAP agent** — a paid CROO Agent Protocol agent that settles USDC on Base.
- **REST API** — HTTP interface over the verification engine.
- **Client SDK** — a TypeScript client other agents/users call.

## Monorepo Layout

This is a single-`tsconfig` TypeScript monorepo (ESM, Node 18+). All package source
lives under `<dir>/src/`, compiled by one shared `tsconfig.json` (no project
references, no per-package build). Cross-package imports use the `@veritas/<pkg>`
alias; intra-package imports use relative `./x.js` paths.

### Packages (`packages/*`)

| Package | Purpose | Depends on |
|---------|---------|------------|
| `@veritas/core` | Result type, IDs, errors, shared primitives | — |
| `@veritas/contracts` | Zod schemas & shared types for all boundaries | core |
| `@veritas/observability` | Logging, metrics, tracing | core |
| `@veritas/config` | Env loading & validated configuration | core |
| `@veritas/auth` | API keys, principals, authorization | core, contracts |
| `@veritas/persistence` | Repositories & storage abstractions | core, contracts |
| `@veritas/llm` | LLM client (Anthropic) wrappers | core, contracts, observability |
| `@veritas/verification` | The fact-verification engine | core, contracts, llm, observability |
| `@veritas/cap` | CROO Agent Protocol integration | core, contracts, verification, observability |
| `@veritas/billing` | Usage metering & USDC settlement | core, contracts, persistence |
| `@veritas/webhooks` | Outbound webhook delivery | core, contracts, persistence, observability |
| `@veritas/notifications` | Notification dispatch | core, contracts |
| `@veritas/agent-store` | Agent registry/store | core, contracts |
| `@veritas/services` | Application services orchestration | core, contracts, persistence, verification, billing, webhooks, observability, auth |
| `@veritas/sdk` | TypeScript client SDK | core, contracts |
| `@veritas/container` | Dependency-injection composition root | core, services, persistence, verification, llm, cap, billing, webhooks, observability, config, auth |

### Apps (`apps/*`)

| App | Purpose | Run |
|-----|---------|-----|
| `@veritas/api` | REST API server (express) | `npm run api` |
| `@veritas/worker` | Background job worker | `npm run worker` |
| `@veritas/cap-agent` | Paid CAP agent (USDC on Base) | `npm run agent` |

## Running

```bash
npm run typecheck   # tsc --noEmit across the whole program
npm run build       # tsc compile
npm run api         # start the REST API
npm run worker      # start the background worker
npm run agent       # start the CAP agent
```
