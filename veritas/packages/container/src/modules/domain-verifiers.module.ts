// Domain-verifiers module: registers the six specialized verifiers and adapts
// them to the engine's DomainVerifierRouter seam. The scientific verifier is
// wired to REAL, network-backed data sources (Crossref, arXiv, PubMed,
// Retraction Watch) — no mock data in the production path.

import { isOk, systemClock } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import {
  makeVerifierContext,
  aggregateSignals,
} from "@veritas/verifier-kit";
import type {
  SpecializedVerifier,
  SpecializedVerifiableClaim,
  VerifierContext,
  DataSourcePort,
} from "@veritas/verifier-kit";
import { MedicalVerifier, createOpenFdaDrugSource } from "@veritas/verifiers-medical";
import { LegalVerifier, createCourtListenerCaseLawSource } from "@veritas/verifiers-legal";
import {
  NewsVerifier,
  createOutletRegistrySource,
  createCrossSource,
  createRecencySource,
  createWireSource,
} from "@veritas/verifiers-news";
import {
  ScientificVerifier,
  createCrossrefSource,
  createArxivSource,
  createPubMedSource,
  createRetractionSource,
} from "@veritas/verifiers-scientific";
import {
  FinancialVerifier,
  createEdgarSource,
  createMarketDataSource,
  createFundamentalsSource,
} from "@veritas/verifiers-financial";
import { CryptoVerifier, createCoinGeckoPriceFeed } from "@veritas/verifiers-crypto";
import type { DomainVerifierRouter, DomainVerdict } from "@veritas/verification";
import type { Container } from "../container.js";
import { LOGGER, LLM_PROVIDER, DOMAIN_VERIFIER_ROUTER } from "../tokens.js";
import type { Logger } from "@veritas/core";

/** Monotonic counter for verifiable-claim ids (deterministic, no RNG). */
let claimSeq = 0;

/** The full panel of specialized verifiers, in routing-priority order. */
function buildVerifiers(): ReadonlyArray<SpecializedVerifier> {
  return [
    new ScientificVerifier(),
    new MedicalVerifier(),
    new FinancialVerifier(),
    new CryptoVerifier(),
    new LegalVerifier(),
    new NewsVerifier(),
  ];
}

/** Read an API key from the environment, returning undefined when unset/blank. */
function envKey(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Build the registered data sources. Real keyless adapters are wired
 * unconditionally; keyed adapters are wired only when their API key is present
 * in the environment. No mock sources ever enter this map.
 */
function buildSources(): ReadonlyMap<string, DataSourcePort> {
  const sources = new Map<string, DataSourcePort>();

  // Scientific — all public, no API key required.
  sources.set("crossref", createCrossrefSource());
  sources.set("arxiv", createArxivSource());
  sources.set("pubmed", createPubMedSource());
  sources.set("retraction", createRetractionSource());

  // Medical — openFDA drug labels (keyless; an optional key raises rate limits).
  sources.set("drug-db", createOpenFdaDrugSource({ apiKey: envKey("OPENFDA_API_KEY") }));

  // Legal — CourtListener case law is public (an optional token raises limits).
  sources.set("case-law", createCourtListenerCaseLawSource({ apiToken: envKey("COURTLISTENER_API_TOKEN") }));

  // Crypto — CoinGecko price feed is public (an optional key raises limits).
  sources.set("price-feed", createCoinGeckoPriceFeed({ apiKey: envKey("COINGECKO_API_KEY") }));

  // Financial — SEC EDGAR full-text search is public and keyless.
  sources.set("edgar", createEdgarSource());

  // Financial keyed sources — wired only when credentials are configured.
  const marketKey = envKey("MARKET_DATA_API_KEY");
  if (marketKey) sources.set("market-data", createMarketDataSource(false, marketKey));
  const fundamentalsKey = envKey("FUNDAMENTALS_API_KEY");
  if (fundamentalsKey) sources.set("fundamentals", createFundamentalsSource(false, fundamentalsKey));

  // News keyed sources — all require a news API key; wired only when configured.
  const newsKey = envKey("NEWS_API_KEY");
  if (newsKey) {
    sources.set("outlet-registry", createOutletRegistrySource(false, newsKey));
    sources.set("cross-source", createCrossSource(false, newsKey));
    sources.set("recency", createRecencySource(false, newsKey));
    sources.set("wire", createWireSource(false, newsKey));
  }

  return sources;
}

/** Summarise a verifier's signals into a short rationale string. */
function summariseRationale(signalRationales: readonly string[]): string {
  if (signalRationales.length === 0) return "no domain-specific evidence found";
  return signalRationales.slice(0, 2).join("; ");
}

/**
 * Adapt the verifier panel to the DomainVerifierRouter seam: route each claim to
 * the first verifier that can handle it, run it, and aggregate its signals into
 * a single DomainVerdict.
 */
function buildRouter(
  verifiers: ReadonlyArray<SpecializedVerifier>,
  ctx: VerifierContext,
  logger: Logger | undefined,
): DomainVerifierRouter {
  return {
    async verify(claimText: string): Promise<DomainVerdict | null> {
      claimSeq += 1;
      const claim: SpecializedVerifiableClaim = { id: `domain-${claimSeq}`, text: claimText };

      const verifier = verifiers.find((v) => v.canHandle(claim));
      if (verifier === undefined) return null;

      const result = await verifier.verify(claim, ctx);
      if (!isOk(result)) {
        logger?.warn("domain-verifiers: verify failed", {
          verifierId: verifier.id,
          error: result.error instanceof Error ? result.error.message : String(result.error),
        });
        return null;
      }

      const output = result.value;
      const aggregate = aggregateSignals(output.signals);

      return {
        verifierId: output.verifierId,
        verdict: String(aggregate.verdict) as DomainVerdict["verdict"],
        confidence: aggregate.confidence,
        rationale: summariseRationale(output.signals.map((s) => s.rationale)),
      };
    },
  };
}

/**
 * Build a domain-verifier router from an LLM and an explicit sources map.
 * Exposed for testing: passing an empty sources map yields a fully offline
 * router (verifiers run rule-only, no network).
 */
export function buildDomainRouter(
  llm: VerifierLLM,
  sources: ReadonlyMap<string, DataSourcePort>,
  logger?: Logger,
): DomainVerifierRouter {
  const ctx = makeVerifierContext(llm, sources, systemClock);
  return buildRouter(buildVerifiers(), ctx, logger);
}

/** Register the domain-verifier router singleton. */
export function registerDomainVerifiersModule(container: Container): void {
  container.singleton(DOMAIN_VERIFIER_ROUTER, (c): DomainVerifierRouter => {
    const llm = c.resolve<VerifierLLM>(LLM_PROVIDER);
    const logger = c.tryResolve<Logger>(LOGGER);
    logger?.info("domain-verifiers: router ready", { verifiers: 6 });
    return buildDomainRouter(llm, buildSources(), logger);
  });
}
