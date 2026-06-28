# Veritas — A2A Fact-Verification & Source-Provenance Agent (CAP)

> A paid, callable verification agent on the **CROO Agent Protocol (CAP)**. Any
> agent — in any framework — can hire Veritas to fact-check claims (or a block of
> generated text) against **live, cited web sources**, and receives a structured
> verdict with a **tamper-evident, on-chain-auditable provenance record**.

**Tracks:** Data & Verification (primary) · Open – Any A2A Agents (secondary)
**Settlement:** USDC on Base, via CAP escrow · **Brain:** Claude (`claude-opus-4-8`)

---

## Why a verifier?

A verifier is the most *composable* service in the agent economy. A research
agent, a content-ops agent, or a DeFi alert bot all share one need: **don't act
on — or pay for — another agent's output until it's been checked.** Veritas is
that dependency. It's designed to be hired by other agents, which is exactly the
A2A composability CAP exists to enable.

What you get back is not just a yes/no — it's an auditable artifact:

- Per-claim verdict: `SUPPORTED` / `REFUTED` / `UNVERIFIABLE`
- Cited sources with verbatim supporting/refuting quotes
- A calibrated confidence per claim and an aggregate **trust score** (0–100)
- A **provenance block**: a SHA-256 content hash over the inputs + verdicts,
  plus model, version, and timestamp — reproducible by anyone, and matched
  against the `contentHash` CAP records on delivery.

---

## How it works

```
 Buyer agent                         CAP (Base)                    Veritas provider
 ───────────                         ──────────                    ────────────────
 negotiateOrder(requirements) ─────▶ NegotiationCreated ─────────▶ validate requirements
                                                                   accept (or reject if bad)
                              ◀───── OrderCreated
 payOrder()  (USDC → escrow) ──────▶ OrderPaid ──────────────────▶ run verification:
                                                                     1. resolve/extract claims
                                                                     2. web-search evidence (Claude)
                                                                     3. structured adjudication
                                                                     4. hash + assemble report
                              ◀───── OrderCompleted ◀────────────── deliverOrder(Schema, report)
 getDelivery() → report                (settle on-chain)
```

The CAP lifecycle is **Negotiate → Lock → Deliver → Clear**. Veritas validates
the request at *negotiation* time, so a buyer never locks funds against
malformed input. Verification runs only after payment; the result is delivered
as a `Schema` deliverable and settled on-chain.

---

## The A2A interface (the whole contract)

**Input** — the CAP negotiation `requirements` string is JSON:

```jsonc
{
  // provide EITHER claims OR text
  "claims": ["The Eiffel Tower is in Paris.", "Bitcoin launched in 2009."],
  "text": "A paragraph of generated output to fact-check…",
  "context": "Optional: domain / time frame / subject to disambiguate.",
  "options": { "allowedDomains": ["wikipedia.org", "reuters.com"] }
}
```

**Output** — the delivery `deliverableSchema` string is a `veritas.report.v1`:

```jsonc
{
  "schema": "veritas.report.v1",
  "summary": "Checked 3 claims: 2 supported, 1 refuted, 0 unverifiable. Aggregate trust score: 66.7/100.",
  "trustScore": 66.7,
  "counts": { "supported": 2, "refuted": 1, "unverifiable": 0, "skipped": 0 },
  "claims": [
    {
      "claim": "The Eiffel Tower is in Paris.",
      "verdict": "SUPPORTED",
      "confidence": 0.99,
      "reasoning": "…",
      "citations": [{ "url": "https://…", "title": "…", "quote": "…" }]
    }
  ],
  "provenance": {
    "contentHash": "sha256:…",     // reproducible commitment over { request, claims }
    "verifier": "veritas",
    "verifierVersion": "1.0.0",
    "model": "claude-opus-4-8",
    "effort": "high",
    "createdAt": "2026-06-27T…Z",
    "claimCount": 3,
    "sourceCount": 4
  }
}
```

Both sides are validated with Zod at the boundary (`src/verify/schema.ts`).

---

## Setup

Requires **Node.js 18+**.

```bash
git clone <this-repo>
cd veritas
npm install
cp .env.example .env   # then fill in the values below
```

1. **Register on the CROO Agent Store.** Create an agent, then a **service**
   (name it e.g. "Veritas — Fact Verification", price it in USDC, set the
   deliverable type to *Schema*). Copy the **SDK-Key** (shown once).
2. Fill `.env`:
   - `CROO_API_URL`, `CROO_WS_URL`, `CROO_SDK_KEY` — from the dashboard
   - `ANTHROPIC_API_KEY` — the verification brain
   - (optional) `VERITAS_MODEL`, `VERITAS_EFFORT`, `VERITAS_MAX_CLAIMS`,
     `VERITAS_CONCURRENCY`, `VERITAS_MAX_SEARCHES`, `VERITAS_LOG_LEVEL`

### Run the provider (go live)

```bash
npm start          # connects the WebSocket, accepts jobs, settles on-chain
```

### Try the verification engine locally (no CAP round-trip)

```bash
echo '{"claims":["The Great Wall of China is visible from the Moon with the naked eye."]}' \
  | npm run verify:local
```

### Hire Veritas from another agent (A2A demo)

In a second terminal, with `CROO_TARGET_SERVICE_ID` set to your listed service:

```bash
CROO_TARGET_SERVICE_ID=<veritas service id> npm run requester
```

`examples/requester.ts` is a complete buyer agent: it opens a negotiation, pays
USDC into escrow on `OrderCreated`, and prints the verified report on
`OrderCompleted` — the exact pattern any dependent agent would use.

### Quality gates

```bash
npm run typecheck   # tsc --noEmit
npm test            # 22 unit tests (vitest)
npm run build       # emit dist/
```

---

## CAP SDK methods used (`@croo-network/sdk`)

| Method | Where | Purpose |
| --- | --- | --- |
| `new AgentClient(config, sdkKey)` | `src/croo/client.ts` | Runtime client (auth + on-chain settlement) |
| `connectWebSocket()` → `EventStream` | `src/croo/provider.ts` | Real-time CAP event stream |
| `EventStream.on(EventType.*, …)` | `src/croo/provider.ts` | Subscribe to lifecycle events |
| `getNegotiation(id)` | provider | Load `requirements` to validate |
| `acceptNegotiation(id)` / `rejectNegotiation(id, reason)` | provider | Accept valid jobs, reject malformed ones pre-payment |
| `deliverOrder(id, { deliverableType: Schema, deliverableSchema })` | provider | Deliver the report; SDK returns a `contentHash` + `txHash` |
| `rejectOrder(id, reason)` | provider | Release escrow if verification can't complete |
| `getOrder(id)` | provider | Fallback request resolution after restart |
| `negotiateOrder(req)` / `payOrder(id)` / `getDelivery(id)` | `examples/requester.ts` | Buyer-side A2A flow |

Events handled: `NegotiationCreated`, `OrderPaid`, `OrderCompleted`,
`OrderRejected`, `OrderExpired` (provider) and `OrderCreated`, `OrderCompleted`
(requester).

---

## Integration notes & design decisions

- **Validate before lock.** Requirements are schema-checked at
  `NegotiationCreated`; invalid input is rejected before any USDC enters escrow.
- **Two-phase verification.** Each claim is first *researched* with Claude's
  server-side `web_search` tool (live evidence), then *adjudicated* with a
  structured-output call. Splitting the phases keeps evidence-gathering free to
  roam while the verdict stays strictly schema-valid.
- **Conservative by construction.** A verdict with no citation is auto-downgraded
  to `UNVERIFIABLE`; the adjudicator is instructed to prefer `UNVERIFIABLE` over
  guessing. Per-claim failures are isolated — one bad claim never fails the job.
- **Reproducible provenance.** `contentHash` is computed over a *canonicalised*
  (key-sorted) `{ request, claims }`, deliberately excluding the timestamp, so
  the same evidence yields the same commitment. Anyone can recompute it; it lines
  up with the `contentHash` CAP stamps on delivery for end-to-end auditability.
- **Sovereign execution.** Data and compute stay yours — only the priced result
  and its hash settle on-chain.
- **Crash-resilient.** If the provider restarts between payment and delivery, it
  reconstructs the request from the order/negotiation via the API.

## Project layout

```
src/
  config.ts            env validation (fail-fast, Zod)
  logger.ts            structured JSON logger (implements CAP Logger)
  index.ts             provider entrypoint
  cli.ts               local verification harness
  croo/
    client.ts          AgentClient factory
    provider.ts        CAP event loop (the integration)
  llm/
    types.ts           VerifierLLM interface (vendor-agnostic seam)
    anthropic.ts       Claude-backed research + adjudication
  verify/
    schema.ts          the A2A request/report contract
    engine.ts          orchestration + report assembly
    provenance.ts      canonical hashing + trust score
examples/requester.ts  buyer agent (A2A composability demo)
test/                  22 unit tests
```

## License

MIT — see [LICENSE](./LICENSE).
