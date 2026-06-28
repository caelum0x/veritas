// Financial SpecializedVerifier: orchestrates SEC, market, and fundamentals sources to verify financial claims.

import { ok, isOk, epochToIso, asIsoTimestamp, type Result, type IsoTimestamp } from "@veritas/core";
import {
  makeEvidenceBundle,
  requireSource,
  type SpecializedVerifier,
  type VerifiableClaim,
  type VerifierContext,
  type VerifierOutput,
  type DomainEvidence,
  type EvidenceStance,
} from "@veritas/verifier-kit";
import { canHandleFinancialClaim, extractTickers } from "./matcher.js";
import {
  makeFinancialEvidenceResult,
  type SecFilingEvidence,
  type MarketDataEvidence,
  type FundamentalsEvidence,
} from "./evidence.js";
import { makeFinancialSignals } from "./signals.js";
import { buildFinancialAnalysisPrompt, FINANCIAL_SYSTEM_PROMPT } from "./prompts.js";

const VERIFIER_ID = "veritas-financial";

/** Infer stance from relevance score and text heuristic. */
function inferStance(snippet: string, claimText: string): EvidenceStance {
  const lower = snippet.toLowerCase();
  const claimLower = claimText.toLowerCase();
  const hasNegation = /not|no |failed|miss|declin|drop|fall|below|less than/.test(lower);
  const claimHasNegation = /not|no |failed|miss|declin|drop|fall|below|less than/.test(claimLower);
  if (hasNegation !== claimHasNegation) return "refutes";
  if (lower.includes("confirm") || lower.includes("report") || lower.includes("record")) return "supports";
  return "neutral";
}

/** Build a SecFilingEvidence item from a SourceDocument. */
function toFilingEvidence(doc: {
  id: string; url: string; title: string; snippet: string;
  publishedAt: string | null; metadata: Readonly<Record<string, unknown>>;
}, claimText: string, retrievedAt: IsoTimestamp): SecFilingEvidence {
  const rawPublished = doc.publishedAt;
  const publishedAt: IsoTimestamp | null = rawPublished != null ? asIsoTimestamp(rawPublished) : null;
  const rawFilingDate = String(doc.metadata["filingDate"] ?? retrievedAt);
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "sec-filing",
    excerpt: doc.snippet,
    relevanceScore: 0.75,
    stance: inferStance(doc.snippet, claimText),
    publishedAt,
    retrievedAt,
    metadata: {
      cik: String(doc.metadata["cik"] ?? ""),
      accessionNumber: String(doc.metadata["accessionNumber"] ?? ""),
      formType: String(doc.metadata["formType"] ?? "10-K"),
      filingDate: asIsoTimestamp(rawFilingDate),
      reportPeriod: doc.metadata["reportPeriod"] != null ? asIsoTimestamp(String(doc.metadata["reportPeriod"])) : null,
      companyName: String(doc.metadata["companyName"] ?? ""),
      ticker: doc.metadata["ticker"] != null ? String(doc.metadata["ticker"]) : undefined,
    },
  };
}

/** Build a MarketDataEvidence item from a SourceDocument. */
function toMarketEvidence(doc: {
  id: string; url: string; title: string; snippet: string;
  publishedAt: string | null; metadata: Readonly<Record<string, unknown>>;
}, claimText: string, retrievedAt: IsoTimestamp): MarketDataEvidence {
  const rawPublished = doc.publishedAt;
  const publishedAt: IsoTimestamp | null = rawPublished != null ? asIsoTimestamp(rawPublished) : null;
  const rawDataDate = String(doc.metadata["dataDate"] ?? retrievedAt);
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "market-data",
    excerpt: doc.snippet,
    relevanceScore: 0.7,
    stance: inferStance(doc.snippet, claimText),
    publishedAt,
    retrievedAt,
    metadata: {
      ticker: String(doc.metadata["ticker"] ?? ""),
      exchange: String(doc.metadata["exchange"] ?? "NASDAQ"),
      price: Number(doc.metadata["price"] ?? 0),
      volume: Number(doc.metadata["volume"] ?? 0),
      marketCap: doc.metadata["marketCap"] != null ? Number(doc.metadata["marketCap"]) : undefined,
      dataDate: asIsoTimestamp(rawDataDate),
      source: String(doc.metadata["source"] ?? "market"),
    },
  };
}

/** Build a FundamentalsEvidence item from a SourceDocument. */
function toFundamentalsEvidence(doc: {
  id: string; url: string; title: string; snippet: string;
  publishedAt: string | null; metadata: Readonly<Record<string, unknown>>;
}, claimText: string, retrievedAt: IsoTimestamp): FundamentalsEvidence {
  const rawPublished = doc.publishedAt;
  const publishedAt: IsoTimestamp | null = rawPublished != null ? asIsoTimestamp(rawPublished) : null;
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "fundamentals",
    excerpt: doc.snippet,
    relevanceScore: 0.7,
    stance: inferStance(doc.snippet, claimText),
    publishedAt,
    retrievedAt,
    metadata: {
      ticker: String(doc.metadata["ticker"] ?? ""),
      period: String(doc.metadata["period"] ?? "annual"),
      fiscalYear: Number(doc.metadata["fiscalYear"] ?? new Date().getFullYear()),
      fiscalQuarter: doc.metadata["fiscalQuarter"] != null ? Number(doc.metadata["fiscalQuarter"]) as 1 | 2 | 3 | 4 : undefined,
      revenue: doc.metadata["revenue"] != null ? Number(doc.metadata["revenue"]) : undefined,
      netIncome: doc.metadata["netIncome"] != null ? Number(doc.metadata["netIncome"]) : undefined,
      eps: doc.metadata["eps"] != null ? Number(doc.metadata["eps"]) : undefined,
      peRatio: doc.metadata["peRatio"] != null ? Number(doc.metadata["peRatio"]) : undefined,
      debtToEquity: doc.metadata["debtToEquity"] != null ? Number(doc.metadata["debtToEquity"]) : undefined,
    },
  };
}

/** Financial SpecializedVerifier implementation. */
export class FinancialVerifier implements SpecializedVerifier {
  readonly id = VERIFIER_ID;
  readonly displayName = "Financial & SEC Verifier";
  readonly domains: ReadonlyArray<string> = ["financial", "finance", "sec", "edgar", "market", "stock", "equity"];

  canHandle(claim: VerifiableClaim): boolean {
    return canHandleFinancialClaim(claim);
  }

  async verify(claim: VerifiableClaim, ctx: VerifierContext): Promise<Result<VerifierOutput>> {
    const retrievedAt = epochToIso(ctx.clock.now());
    const tickers = extractTickers(claim.text);
    const keywords = [...tickers, ...claim.text.split(/\s+/).slice(0, 6)];

    // Query all three data sources in parallel
    const [edgarResult, marketResult, fundamentalsResult] = await Promise.all([
      ctx.sources.has("edgar")
        ? requireSource(ctx, "edgar").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("market-data")
        ? requireSource(ctx, "market-data").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("fundamentals")
        ? requireSource(ctx, "fundamentals").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
    ]);

    const filingDocs = isOk(edgarResult) ? edgarResult.value : [];
    const marketDocs = isOk(marketResult) ? marketResult.value : [];
    const fundamentalsDocs = isOk(fundamentalsResult) ? fundamentalsResult.value : [];

    const filingEvidence = filingDocs.map((d) => toFilingEvidence(d, claim.text, retrievedAt));
    const marketEvidence = marketDocs.map((d) => toMarketEvidence(d, claim.text, retrievedAt));
    const fundamentalsEvidence = fundamentalsDocs.map((d) => toFundamentalsEvidence(d, claim.text, retrievedAt));

    const evidenceResult = makeFinancialEvidenceResult(
      claim.id,
      tickers[0] ?? null,
      filingEvidence,
      marketEvidence,
      fundamentalsEvidence,
    );

    const allEvidence: ReadonlyArray<DomainEvidence> = [
      ...filingEvidence,
      ...marketEvidence,
      ...fundamentalsEvidence,
    ];

    // Use LLM for adjudication when evidence is available
    let llmRationale: string | null = null;
    if (allEvidence.length > 0) {
      try {
        const evidenceSummaries = allEvidence.slice(0, 8).map((e) => ({
          label: e.label,
          excerpt: e.excerpt,
          sourceUri: e.sourceUri,
        }));
        void FINANCIAL_SYSTEM_PROMPT; // used as context marker; injected via adjudicate options
        const analysisPrompt = buildFinancialAnalysisPrompt(claim, evidenceSummaries);
        const llmResponse = await ctx.llm.adjudicate(analysisPrompt);
        if (isOk(llmResponse)) {
          llmRationale = llmResponse.value.explanation;
        }
      } catch {
        // LLM failure is non-fatal; signals still derive from evidence
      }
    }

    const signals = makeFinancialSignals(evidenceResult);
    const bundle = makeEvidenceBundle(VERIFIER_ID, claim.text, allEvidence, retrievedAt);

    const signalsWithLlm = llmRationale != null
      ? signals.map((s, i) =>
          i === 0
            ? { ...s, rationale: s.rationale + ` LLM adjudication: ${llmRationale!.slice(0, 200)}` }
            : s
        )
      : signals;

    return ok({
      verifierId: VERIFIER_ID,
      evidence: bundle,
      signals: signalsWithLlm,
    });
  }
}

/** Singleton factory for the financial verifier. */
export function createFinancialVerifier(): FinancialVerifier {
  return new FinancialVerifier();
}
