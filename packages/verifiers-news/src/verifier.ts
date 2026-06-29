// News SpecializedVerifier: orchestrates outlet, cross-source, recency, and wire sources to verify news claims.

import { ok, isOk, epochToIso, asIsoTimestamp, type IsoTimestamp, type Result } from "@veritas/core";
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
import { canHandleNewsClaim, extractOutlets } from "./matcher.js";
import {
  makeNewsEvidenceResult,
  type OutletEvidence,
  type CrossSourceEvidence,
  type RecencyEvidence,
  type WireEvidence,
} from "./evidence.js";
import { makeNewsSignals } from "./signals.js";
import { buildNewsAnalysisPrompt, NEWS_SYSTEM_PROMPT } from "./prompts.js";

const VERIFIER_ID = "veritas-news";

/** Safely convert a string to IsoTimestamp, or null if empty/invalid. */
function toIso(value: string | null | undefined): IsoTimestamp | null {
  if (!value) return null;
  try {
    return asIsoTimestamp(value);
  } catch {
    return null;
  }
}

/** Infer stance from snippet content relative to the claim. */
function inferStance(snippet: string, claimText: string): EvidenceStance {
  const lower = snippet.toLowerCase();
  const claimLower = claimText.toLowerCase();
  const hasNegation = /\b(not|no |false|denied|debunked|incorrect|misleading|fabricated)\b/.test(lower);
  const claimHasNegation = /\b(not|no |false|denied|debunked|incorrect|misleading|fabricated)\b/.test(claimLower);
  if (hasNegation !== claimHasNegation) return "refutes";
  if (/\b(confirm|report|verify|corroborate|show|reveal|find)\b/.test(lower)) return "supports";
  return "neutral";
}

/** Build an OutletEvidence item from a SourceDocument. */
function toOutletEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: IsoTimestamp,
): OutletEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "news-outlet",
    excerpt: doc.snippet,
    relevanceScore: 0.72,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: toIso(doc.publishedAt),
    retrievedAt,
    metadata: {
      outletName: String(doc.metadata["outletName"] ?? "Unknown"),
      outletTier: (doc.metadata["outletTier"] as "tier1" | "tier2" | "tier3" | "unknown") ?? "unknown",
      author: doc.metadata["author"] != null ? String(doc.metadata["author"]) : undefined,
      section: doc.metadata["section"] != null ? String(doc.metadata["section"]) : undefined,
      wordCount: doc.metadata["wordCount"] != null ? Number(doc.metadata["wordCount"]) : undefined,
      hasByline: Boolean(doc.metadata["hasByline"] ?? false),
      isOpinion: Boolean(doc.metadata["isOpinion"] ?? false),
      isSatire: Boolean(doc.metadata["isSatire"] ?? false),
    },
  };
}

/** Build a CrossSourceEvidence item from a SourceDocument. */
function toCrossSourceEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: IsoTimestamp,
): CrossSourceEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "cross-source",
    excerpt: doc.snippet,
    relevanceScore: 0.8,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: toIso(doc.publishedAt),
    retrievedAt,
    metadata: {
      corroboratingOutlets: (doc.metadata["corroboratingOutlets"] as string[]) ?? [],
      corroborationCount: Number(doc.metadata["corroborationCount"] ?? 0),
      contradictingOutlets: (doc.metadata["contradictingOutlets"] as string[]) ?? [],
      contradictionCount: Number(doc.metadata["contradictionCount"] ?? 0),
      wireServiceConfirmed: Boolean(doc.metadata["wireServiceConfirmed"] ?? false),
    },
  };
}

/** Build a RecencyEvidence item from a SourceDocument. */
function toRecencyEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: IsoTimestamp,
): RecencyEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "news-recency",
    excerpt: doc.snippet,
    relevanceScore: 0.65,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: toIso(doc.publishedAt),
    retrievedAt,
    metadata: {
      claimDate: toIso(doc.metadata["claimDate"] as string | null),
      oldestConfirmingSource: toIso(doc.metadata["oldestConfirmingSource"] as string | null),
      newestConfirmingSource: toIso(doc.metadata["newestConfirmingSource"] as string | null),
      ageHours: doc.metadata["ageHours"] != null ? Number(doc.metadata["ageHours"]) : null,
      isCurrentlyReported: Boolean(doc.metadata["isCurrentlyReported"] ?? false),
      hasUpdates: Boolean(doc.metadata["hasUpdates"] ?? false),
      updateCount: Number(doc.metadata["updateCount"] ?? 0),
    },
  };
}

/** Build a WireEvidence item from a SourceDocument. */
function toWireEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: IsoTimestamp,
): WireEvidence {
  const wireService = (doc.metadata["wireService"] as "ap" | "reuters" | "afp" | "bloomberg" | "other") ?? "other";
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "wire-service",
    excerpt: doc.snippet,
    relevanceScore: 0.85,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: toIso(doc.publishedAt),
    retrievedAt,
    metadata: {
      wireService,
      dateline: doc.metadata["dateline"] != null ? String(doc.metadata["dateline"]) : undefined,
      storyId: doc.metadata["storyId"] != null ? String(doc.metadata["storyId"]) : undefined,
      wordCount: doc.metadata["wordCount"] != null ? Number(doc.metadata["wordCount"]) : undefined,
    },
  };
}

/** News SpecializedVerifier implementation. */
export class NewsVerifier implements SpecializedVerifier {
  readonly id = VERIFIER_ID;
  readonly displayName = "News & Media Verifier";
  readonly domains: ReadonlyArray<string> = [
    "news", "media", "journalism", "current-events", "politics", "world", "press",
  ];

  canHandle(claim: VerifiableClaim): boolean {
    return canHandleNewsClaim(claim);
  }

  async verify(claim: VerifiableClaim, ctx: VerifierContext): Promise<Result<VerifierOutput>> {
    const retrievedAt = epochToIso(ctx.clock.now());
    const outlets = extractOutlets(claim.text);
    const keywords = [...outlets, ...claim.text.split(/\s+/).slice(0, 8)];

    // Query all four data sources in parallel
    const [outletResult, crossSourceResult, recencyResult, wireResult] = await Promise.all([
      ctx.sources.has("outlet-registry")
        ? requireSource(ctx, "outlet-registry").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("cross-source")
        ? requireSource(ctx, "cross-source").search({ keywords, maxResults: 3 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("recency")
        ? requireSource(ctx, "recency").search({ keywords, maxResults: 3 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("wire")
        ? requireSource(ctx, "wire").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
    ]);

    const outletDocs = isOk(outletResult) ? outletResult.value : [];
    const crossDocs = isOk(crossSourceResult) ? crossSourceResult.value : [];
    const recencyDocs = isOk(recencyResult) ? recencyResult.value : [];
    const wireDocs = isOk(wireResult) ? wireResult.value : [];

    const outletEvidence = outletDocs.map((d) => toOutletEvidence(d, claim.text, retrievedAt));
    const crossSourceEvidence = crossDocs.map((d) => toCrossSourceEvidence(d, claim.text, retrievedAt));
    const recencyEvidence = recencyDocs.map((d) => toRecencyEvidence(d, claim.text, retrievedAt));
    const wireEvidence = wireDocs.map((d) => toWireEvidence(d, claim.text, retrievedAt));

    const evidenceResult = makeNewsEvidenceResult(
      claim.id,
      outlets,
      outletEvidence,
      crossSourceEvidence,
      recencyEvidence,
      wireEvidence,
    );

    const allEvidence: ReadonlyArray<DomainEvidence> = [
      ...outletEvidence,
      ...crossSourceEvidence,
      ...recencyEvidence,
      ...wireEvidence,
    ];

    const evidenceSummaries = allEvidence.slice(0, 8).map((e) => ({
      label: e.label,
      excerpt: e.excerpt,
      sourceUri: e.sourceUri,
    }));

    // Use LLM for adjudication when evidence is available
    let llmRationale: string | null = null;
    if (allEvidence.length > 0) {
      try {
        const userPrompt = buildNewsAnalysisPrompt(claim, evidenceSummaries);
        // buildNewsAnalysisPrompt embeds system context; pass as claimText for adjudication
        const llmResponse = await ctx.llm.adjudicate(
          `${NEWS_SYSTEM_PROMPT}\n\n${userPrompt}`,
          { maxOutputTokens: 512 },
        );
        if (isOk(llmResponse)) {
          llmRationale = llmResponse.value.explanation;
        }
      } catch {
        // LLM failure is non-fatal; signals still derive from evidence
      }
    }

    const signals = makeNewsSignals(evidenceResult);
    const bundle = makeEvidenceBundle(VERIFIER_ID, claim.text, allEvidence, retrievedAt);

    const signalsWithLlm = llmRationale != null
      ? signals.map((s, i) =>
          i === 0
            ? { ...s, rationale: s.rationale + ` LLM adjudication: ${llmRationale!.slice(0, 200)}` }
            : s,
        )
      : signals;

    return ok({
      verifierId: VERIFIER_ID,
      evidence: bundle,
      signals: signalsWithLlm,
    });
  }
}

/** Singleton factory for the news verifier. */
export function createNewsVerifier(): NewsVerifier {
  return new NewsVerifier();
}
