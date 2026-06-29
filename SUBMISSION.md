# Veritas — CROO Agent Hackathon submission

Paste-ready copy for the **DoraHacks BUIDL** and the **CROO Agent Store** listing.
Fill the `‹…›` placeholders before submitting.

---

## Submission checklist (all five required)

- [x] **Open source** — public GitHub repo, MIT license: https://github.com/caelum0x/veritas
- [x] **Integrated with CAP** — callable provider (`apps/cap-agent` + `packages/cap`, `@croo-network/sdk`), settles in USDC on Base
- [x] **README + setup** — [README.md](./README.md): setup, SDK/integration notes, architecture
- [ ] **Listed on CROO Agent Store** — ‹listing URL›
- [ ] **Demo video (≤5 min) + BUIDL on DoraHacks** — ‹video URL› + file all DoraHacks fields

---

## DoraHacks BUIDL fields

**Name:** Veritas

**One-liner:** The verifier other agents hire before they trust an answer — paid, callable fact-checking with cited sources and on-chain provenance.

**Tracks (max 2):** Data & Verification Agents (primary) · Open – Any A2A Agents (secondary)

**Description:**
> Veritas is a paid, callable fact-verification agent on the CROO Agent Protocol. Any
> agent — in any framework — can hire it to fact-check claims (or a block of generated
> text) against live, cited primary sources, and receive a structured verdict
> (`SUPPORTED` / `REFUTED` / `UNVERIFIABLE`) with per-claim citations, a calibrated
> confidence, an aggregate trust score, and a tamper-evident SHA-256 provenance hash
> that settles on-chain.
>
> A verifier is the most composable service in the agent economy: research agents,
> content-ops agents, and DeFi bots all need to check another agent's output before
> they act on or pay for it. Veritas is built to be that dependency — the A2A
> composability CAP exists to enable.
>
> Claims are routed to six specialized verifier domains, each backed by a live API:
> Scientific (Crossref, arXiv, PubMed, Retraction Watch), Medical (openFDA, NLM
> ICD-10-CM), Financial (SEC EDGAR), Legal (CourtListener), Crypto (CoinGecko, EVM
> JSON-RPC, Sourcify), and News. No mock data ever enters the production path. The
> reasoning brain is Claude `claude-opus-4-8`. Verification only runs after payment
> locks in CAP escrow; the result is delivered with a content hash and settled in USDC
> on Base.

**Tech stack:** TypeScript (Node 18+), `@croo-network/sdk`, CAP (Base, chainId 8453, USDC), Anthropic Claude `claude-opus-4-8`, Zod, Express, `node:test`. Monorepo (~31 apps / ~190 packages).

**CAP / SDK integration notes:**
- Provider entrypoint: `apps/cap-agent/` (boot, supervise, health, graceful shutdown).
- CAP runtime: `packages/cap/` — client, event-router, `lifecycle/`, `negotiation-policy.ts`, `delivery-builder.ts`, `settlement.ts`.
- A2A bridge: `packages/a2a-protocol/cap-bridge.ts` (A2A task ⇄ CAP negotiation).
- Lifecycle: validate + accept/reject negotiation → run verification on `OrderPaid` → deliver report + `contentHash` → record on-chain USDC settlement.

**Repository:** https://github.com/caelum0x/veritas (MIT)

**Demo video (≤5 min):** ‹URL›

**Live showcase:** https://veritas-showcase-arhansubas-projects.vercel.app · **CROO Store listing:** ‹URL›

**Wallet / agent id:** ‹CROO_AGENT_ID / on-chain address›

---

## CROO Agent Store listing copy

**Agent name:** Veritas

**Service name:** Veritas — Fact Verification

**Short blurb (≤140 chars):**
> Hire a verifier. Send claims or text, get back cited verdicts + a trust score with on-chain provenance. Paid in USDC.

**Long description:**
> Veritas fact-checks claims and generated text against live, cited primary sources
> across six domains (scientific, medical, financial, legal, crypto, news). You get a
> per-claim verdict (SUPPORTED / REFUTED / UNVERIFIABLE), verbatim source quotes, a
> calibrated confidence, an aggregate trust score (0–100), and a reproducible SHA-256
> provenance hash. Built for A2A: hire Veritas as a dependency before you act on
> another agent's output.

**Deliverable type:** Schema (`veritas.report.v1`)

**Pricing (suggested):** flat USDC per job with a per-claim component, e.g. base
`0.50 USDC` + `0.10 USDC`/claim (tune to your cost ceiling, `CROO_MIN/MAX_SETTLEMENT_USDC`).
Verification only runs after payment; malformed requests are rejected pre-escrow.

**Input format (requirements):**
```json
{ "claims": ["…"], "text": "…", "context": "optional" }
```

**Output format (deliverable):** `veritas.report.v1` — see [README](./README.md#the-a2a-contract).

**Tags:** fact-checking, verification, provenance, citations, research, trust, A2A, data.

---

## Media for the DoraHacks gallery

Live site: https://veritas-showcase-arhansubas-projects.vercel.app · all assets in `media/`:

| File | Use |
| --- | --- |
| `media/showcase-hero.png` | hero / cover image |
| `media/showcase-full.png` | full-page screenshot |
| `media/showcase-walkthrough.mp4` | site walkthrough video |
| `media/gallery-how.png` | "How a job runs" (CAP lifecycle) |
| `media/gallery-sources.png` | live data sources grid |
| `media/gallery-cap.png` | CAP integration |
| `media/gallery-demo.png` | demo section |
| `media/mobile-hero.png` · `media/mobile-full.png` | mobile views |

> The site walkthrough is a product showcase, **not** the agent demo. The required
> ≤5-min demo video (hire → pay USDC → verified report → on-chain settle) is recorded
> once the agent is deployed and listed.

---

## Notes for reviewers / human spot-check

- Run `npm run typecheck` (0 errors across packages + all 31 apps) and `npm test`
  (49 passing) to verify the build.
- `CROO_SIMULATE=true` runs the full lifecycle without broadcasting real transactions
  — useful for a dry-run during review.
- Real source calls are live: e.g. the crypto/scientific/medical/legal/financial
  verifiers hit Crossref, openFDA, SEC EDGAR, CourtListener, CoinGecko, Sourcify, and
  NLM ICD endpoints directly (keyless).
