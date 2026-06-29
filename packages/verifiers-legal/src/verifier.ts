// Legal SpecializedVerifier: orchestrates statute, case-law, and jurisdiction sources to verify legal claims.

import { ok, isOk, epochToIso, asIsoTimestamp, asScore, type Result, type IsoTimestamp } from "@veritas/core";
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
import { canHandleLegalClaim, extractJurisdictions, extractCaseCitations } from "./matcher.js";
import {
  makeLegalEvidenceResult,
  type StatuteEvidence,
  type CaseLawEvidence,
  type JurisdictionEvidence,
} from "./evidence.js";
import { makeLegalSignals } from "./signals.js";
import { buildLegalAnalysisPrompt, LEGAL_SYSTEM_PROMPT } from "./prompts.js";

const VERIFIER_ID = "veritas-legal";

/** Coerce a string | null to IsoTimestamp | null, falling back to null on parse failure. */
function toIsoOrNull(value: string | null): IsoTimestamp | null {
  if (value == null) return null;
  try {
    return asIsoTimestamp(value);
  } catch {
    return null;
  }
}

/** Infer stance from snippet vs claim negation patterns. */
function inferStance(snippet: string, claimText: string): EvidenceStance {
  const lower = snippet.toLowerCase();
  const claimLower = claimText.toLowerCase();
  const hasNegation = /not|no |void|invalid|unconstitutional|illegal|prohibited|repealed/.test(lower);
  const claimHasNegation = /not|no |void|invalid|unconstitutional|illegal|prohibited/.test(claimLower);
  if (hasNegation !== claimHasNegation) return "refutes";
  if (/codif|enacted|provides|requires|establishes|confirm|permits|authoriz/.test(lower)) return "supports";
  return "neutral";
}

/** Map a SourceDocument to StatuteEvidence. */
function toStatuteEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: IsoTimestamp,
): StatuteEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "statute",
    excerpt: doc.snippet,
    relevanceScore: 0.75,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: toIsoOrNull(doc.publishedAt),
    retrievedAt,
    metadata: {
      jurisdiction: String(doc.metadata["jurisdiction"] ?? "unknown"),
      code: String(doc.metadata["code"] ?? ""),
      section: String(doc.metadata["section"] ?? ""),
      title: String(doc.metadata["title"] ?? doc.title),
      effectiveDate: toIsoOrNull((doc.metadata["effectiveDate"] as string | null | undefined) ?? null),
      repealedDate: toIsoOrNull((doc.metadata["repealedDate"] as string | null | undefined) ?? null),
      citationString: String(doc.metadata["citationString"] ?? ""),
    },
  };
}

/** Map a SourceDocument to CaseLawEvidence. */
function toCaseLawEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  claimText: string,
  retrievedAt: IsoTimestamp,
): CaseLawEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "case-law",
    excerpt: doc.snippet,
    relevanceScore: 0.7,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: toIsoOrNull(doc.publishedAt),
    retrievedAt,
    metadata: {
      court: String(doc.metadata["court"] ?? "Unknown Court"),
      jurisdiction: String(doc.metadata["jurisdiction"] ?? "unknown"),
      docketNumber: String(doc.metadata["docketNumber"] ?? ""),
      decisionDate: toIsoOrNull((doc.metadata["decisionDate"] as string | null | undefined) ?? null),
      citation: String(doc.metadata["citation"] ?? ""),
      parties: String(doc.metadata["parties"] ?? doc.title),
      precedentialStatus: (doc.metadata["precedentialStatus"] as "binding" | "persuasive" | "non-precedential" | undefined) ?? "persuasive",
    },
  };
}

/** Map a SourceDocument to JurisdictionEvidence. */
function toJurisdictionEvidence(
  doc: { id: string; url: string; title: string; snippet: string; publishedAt: string | null; metadata: Readonly<Record<string, unknown>> },
  retrievedAt: IsoTimestamp,
): JurisdictionEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "jurisdiction",
    excerpt: doc.snippet,
    relevanceScore: 0.6,
    stance: "neutral",
    publishedAt: toIsoOrNull(doc.publishedAt),
    retrievedAt,
    metadata: {
      jurisdictionCode: String(doc.metadata["jurisdictionCode"] ?? ""),
      jurisdictionName: String(doc.metadata["jurisdictionName"] ?? doc.title),
      legalSystem: (doc.metadata["legalSystem"] as "common-law" | "civil-law" | "mixed" | "religious" | "customary" | undefined) ?? "common-law",
      country: String(doc.metadata["country"] ?? "US"),
      subdivisionType: doc.metadata["subdivisionType"] != null ? String(doc.metadata["subdivisionType"]) : undefined,
    },
  };
}

/** Legal SpecializedVerifier implementation. */
export class LegalVerifier implements SpecializedVerifier {
  readonly id = VERIFIER_ID;
  readonly displayName = "Legal & Statute Verifier";
  readonly domains: ReadonlyArray<string> = [
    "legal", "law", "statute", "case-law", "regulation", "court", "jurisdiction",
    "criminal", "civil", "constitutional", "contract",
  ];

  canHandle(claim: VerifiableClaim): boolean {
    return canHandleLegalClaim(claim);
  }

  async verify(claim: VerifiableClaim, ctx: VerifierContext): Promise<Result<VerifierOutput>> {
    const retrievedAt = epochToIso(ctx.clock.now());
    const jurisdictions = extractJurisdictions(claim.text);
    const caseCites = extractCaseCitations(claim.text);
    const keywords = [
      ...jurisdictions,
      ...caseCites,
      ...claim.text.split(/\s+/).slice(0, 6),
    ];

    const [statuteResult, caseLawResult, jurisdictionResult] = await Promise.all([
      ctx.sources.has("statute")
        ? requireSource(ctx, "statute").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("case-law")
        ? requireSource(ctx, "case-law").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("jurisdiction")
        ? requireSource(ctx, "jurisdiction").search({ keywords: jurisdictions.length > 0 ? jurisdictions : keywords, maxResults: 3 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
    ]);

    const statuteDocs = isOk(statuteResult) ? statuteResult.value : [];
    const caseLawDocs = isOk(caseLawResult) ? caseLawResult.value : [];
    const jurisdictionDocs = isOk(jurisdictionResult) ? jurisdictionResult.value : [];

    const statuteEvidence = statuteDocs.map((d) => toStatuteEvidence(d, claim.text, retrievedAt));
    const caseLawEvidence = caseLawDocs.map((d) => toCaseLawEvidence(d, claim.text, retrievedAt));
    const jurisdictionEvidence = jurisdictionDocs.map((d) => toJurisdictionEvidence(d, retrievedAt));

    const evidenceResult = makeLegalEvidenceResult(
      claim.id,
      jurisdictions[0] ?? null,
      statuteEvidence,
      caseLawEvidence,
      jurisdictionEvidence,
    );

    const allEvidence: ReadonlyArray<DomainEvidence> = [
      ...statuteEvidence,
      ...caseLawEvidence,
      ...jurisdictionEvidence,
    ];

    const evidenceSummaries = allEvidence.slice(0, 8).map((e) => ({
      label: e.label,
      excerpt: e.excerpt,
      sourceUri: e.sourceUri,
    }));

    let llmRationale: string | null = null;
    if (allEvidence.length > 0) {
      try {
        const userPrompt = buildLegalAnalysisPrompt(claim, evidenceSummaries);
        const llmResponse = await ctx.llm.adjudicate(claim.text, {
          researchResult: {
            claimText: claim.text,
            searchQueriesIssued: 0,
            evidence: evidenceSummaries.map((e) => ({
              url: e.sourceUri,
              title: e.label,
              snippet: e.excerpt,
              publishedAt: null,
              stance: "neutral" as const,
              relevanceScore: asScore(0.7),
            })),
            tokensUsed: 0,
            modelId: "mock",
          },
        });
        if (isOk(llmResponse)) {
          const adj = llmResponse.value;
          llmRationale = `${adj.verdict} (confidence: ${adj.confidence}): ${adj.explanation}\n${userPrompt.slice(0, 100)}`;
        }
      } catch {
        // LLM failure is non-fatal; signals still derive from evidence
      }
    }

    const signals = makeLegalSignals(evidenceResult);
    const bundle = makeEvidenceBundle(VERIFIER_ID, claim.text, allEvidence, retrievedAt);

    const signalsWithLlm = llmRationale != null
      ? signals.map((s, i) =>
          i === 0
            ? { ...s, rationale: s.rationale + ` LLM adjudication: ${llmRationale!.slice(0, 200)}` }
            : s,
        )
      : signals;

    return ok({ verifierId: VERIFIER_ID, evidence: bundle, signals: signalsWithLlm });
  }
}

/** Singleton factory for the legal verifier. */
export function createLegalVerifier(): LegalVerifier {
  return new LegalVerifier();
}
