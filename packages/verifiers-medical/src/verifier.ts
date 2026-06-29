// Medical SpecializedVerifier: orchestrates drug-db, guidelines, ICD, and evidence-grade sources to verify medical claims.

import { ok, isOk, epochToIso, asIsoTimestamp, type Result } from "@veritas/core";
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
import { canHandleMedicalClaim, extractDrugNames } from "./matcher.js";
import {
  makeMedicalEvidenceResult,
  type DrugDbEvidence,
  type GuidelinesEvidence,
  type IcdEvidence,
  type EvidenceGradeEvidence,
} from "./evidence.js";
import { makeMedicalSignals } from "./signals.js";

const VERIFIER_ID = "veritas-medical";

/** Infer stance from snippet content relative to claim text. */
function inferStance(snippet: string, claimText: string): EvidenceStance {
  const lower = snippet.toLowerCase();
  const claimLower = claimText.toLowerCase();
  const hasRefutation = /not effective|no evidence|contraindicated|disproven|failed to show|no significant/.test(lower);
  const hasSupport = /effective|demonstrated|shown to|approved for|evidence supports|clinical benefit/.test(lower);
  const claimHasNegation = /not|no |ineffective|contraindicated/.test(claimLower);
  if (hasRefutation && !claimHasNegation) return "refutes";
  if (hasRefutation && claimHasNegation) return "supports";
  if (hasSupport && !claimHasNegation) return "supports";
  if (hasSupport && claimHasNegation) return "refutes";
  return "neutral";
}

/** Build a DrugDbEvidence item from a SourceDocument. */
function toDrugDbEvidence(doc: {
  id: string; url: string; title: string; snippet: string;
  publishedAt: string | null; metadata: Readonly<Record<string, unknown>>;
}, claimText: string, retrievedAt: string): DrugDbEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "drug-db",
    excerpt: doc.snippet,
    relevanceScore: 0.8,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: doc.publishedAt != null ? asIsoTimestamp(doc.publishedAt) : null,
    retrievedAt: asIsoTimestamp(retrievedAt),
    metadata: {
      drugId: String(doc.metadata["drugId"] ?? doc.id),
      genericName: String(doc.metadata["genericName"] ?? ""),
      brandNames: Array.isArray(doc.metadata["brandNames"])
        ? (doc.metadata["brandNames"] as string[])
        : [],
      drugClass: String(doc.metadata["drugClass"] ?? ""),
      approvalStatus: String(doc.metadata["approvalStatus"] ?? "unknown"),
      approvalDate: (doc.metadata["approvalDate"] as import("@veritas/core").IsoTimestamp | null) ?? null,
      indications: Array.isArray(doc.metadata["indications"])
        ? (doc.metadata["indications"] as string[])
        : [],
      contraindicationsCount: Number(doc.metadata["contraindicationsCount"] ?? 0),
    },
  };
}

/** Build a GuidelinesEvidence item from a SourceDocument. */
function toGuidelinesEvidence(doc: {
  id: string; url: string; title: string; snippet: string;
  publishedAt: string | null; metadata: Readonly<Record<string, unknown>>;
}, claimText: string, retrievedAt: string): GuidelinesEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "clinical-guideline",
    excerpt: doc.snippet,
    relevanceScore: 0.85,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: doc.publishedAt != null ? asIsoTimestamp(doc.publishedAt) : null,
    retrievedAt: asIsoTimestamp(retrievedAt),
    metadata: {
      guidelineId: String(doc.metadata["guidelineId"] ?? doc.id),
      issuingBody: String(doc.metadata["issuingBody"] ?? ""),
      recommendationGrade: String(doc.metadata["recommendationGrade"] ?? ""),
      evidenceLevel: String(doc.metadata["evidenceLevel"] ?? ""),
      publicationYear: Number(doc.metadata["publicationYear"] ?? new Date().getFullYear()),
      doi: doc.metadata["doi"] != null ? String(doc.metadata["doi"]) : null,
    },
  };
}

/** Build an IcdEvidence item from a SourceDocument. */
function toIcdEvidence(doc: {
  id: string; url: string; title: string; snippet: string;
  publishedAt: string | null; metadata: Readonly<Record<string, unknown>>;
}, claimText: string, retrievedAt: string): IcdEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "icd-code",
    excerpt: doc.snippet,
    relevanceScore: 0.7,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: doc.publishedAt != null ? asIsoTimestamp(doc.publishedAt) : null,
    retrievedAt: asIsoTimestamp(retrievedAt),
    metadata: {
      icdCode: String(doc.metadata["icdCode"] ?? ""),
      icdVersion: (doc.metadata["icdVersion"] as "ICD-10" | "ICD-11") ?? "ICD-10",
      description: String(doc.metadata["description"] ?? doc.title),
      category: String(doc.metadata["category"] ?? ""),
      inclusions: Array.isArray(doc.metadata["inclusions"])
        ? (doc.metadata["inclusions"] as string[])
        : [],
    },
  };
}

/** Build an EvidenceGradeEvidence item from a SourceDocument. */
function toEvidenceGradeEvidence(doc: {
  id: string; url: string; title: string; snippet: string;
  publishedAt: string | null; metadata: Readonly<Record<string, unknown>>;
}, claimText: string, retrievedAt: string): EvidenceGradeEvidence {
  return {
    id: doc.id,
    label: doc.title,
    sourceUri: doc.url,
    sourceType: "evidence-grade",
    excerpt: doc.snippet,
    relevanceScore: 0.75,
    stance: inferStance(doc.snippet, claimText),
    publishedAt: doc.publishedAt != null ? asIsoTimestamp(doc.publishedAt) : null,
    retrievedAt: asIsoTimestamp(retrievedAt),
    metadata: {
      studyType: String(doc.metadata["studyType"] ?? "unknown"),
      gradeLevel: String(doc.metadata["gradeLevel"] ?? ""),
      sampleSize: doc.metadata["sampleSize"] != null ? Number(doc.metadata["sampleSize"]) : null,
      pubmedId: doc.metadata["pubmedId"] != null ? String(doc.metadata["pubmedId"]) : null,
      doi: doc.metadata["doi"] != null ? String(doc.metadata["doi"]) : null,
      journal: doc.metadata["journal"] != null ? String(doc.metadata["journal"]) : null,
      publicationYear: doc.metadata["publicationYear"] != null ? Number(doc.metadata["publicationYear"]) : null,
    },
  };
}

/** Medical SpecializedVerifier implementation. */
export class MedicalVerifier implements SpecializedVerifier {
  readonly id = VERIFIER_ID;
  readonly displayName = "Medical & Clinical Verifier";
  readonly domains: ReadonlyArray<string> = [
    "medical", "medicine", "clinical", "health", "healthcare",
    "drug", "pharmaceutical", "pubmed", "fda", "clinical-trial",
  ];

  canHandle(claim: VerifiableClaim): boolean {
    return canHandleMedicalClaim(claim);
  }

  async verify(claim: VerifiableClaim, ctx: VerifierContext): Promise<Result<VerifierOutput>> {
    const retrievedAt = epochToIso(ctx.clock.now());
    const drugNames = extractDrugNames(claim.text);
    const keywords = [...drugNames, ...claim.text.split(/\s+/).slice(0, 6)];

    // Query all four data sources in parallel
    const [drugResult, guidelinesResult, icdResult, gradeResult] = await Promise.all([
      ctx.sources.has("drug-db")
        ? requireSource(ctx, "drug-db").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("guidelines")
        ? requireSource(ctx, "guidelines").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("icd")
        ? requireSource(ctx, "icd").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
      ctx.sources.has("evidence-grade")
        ? requireSource(ctx, "evidence-grade").search({ keywords, maxResults: 5 })
        : Promise.resolve(ok([] as readonly import("@veritas/verifier-kit").SourceDocument[])),
    ]);

    const drugDocs = isOk(drugResult) ? drugResult.value : [];
    const guidelinesDocs = isOk(guidelinesResult) ? guidelinesResult.value : [];
    const icdDocs = isOk(icdResult) ? icdResult.value : [];
    const gradeDocs = isOk(gradeResult) ? gradeResult.value : [];

    const drugEvidence = drugDocs.map((d) => toDrugDbEvidence(d, claim.text, retrievedAt));
    const guidelinesEvidence = guidelinesDocs.map((d) => toGuidelinesEvidence(d, claim.text, retrievedAt));
    const icdEvidence = icdDocs.map((d) => toIcdEvidence(d, claim.text, retrievedAt));
    const gradeEvidence = gradeDocs.map((d) => toEvidenceGradeEvidence(d, claim.text, retrievedAt));

    const evidenceResult = makeMedicalEvidenceResult(
      claim.id,
      drugNames,
      drugEvidence,
      guidelinesEvidence,
      icdEvidence,
      gradeEvidence,
    );

    const allEvidence: ReadonlyArray<DomainEvidence> = [
      ...drugEvidence,
      ...guidelinesEvidence,
      ...icdEvidence,
      ...gradeEvidence,
    ];

    // Use LLM for adjudication when evidence is available
    let llmRationale: string | null = null;
    if (allEvidence.length > 0) {
      try {
        const llmResponse = await ctx.llm.adjudicate(claim.text, {
          maxOutputTokens: 512,
        });
        if (isOk(llmResponse)) {
          llmRationale = llmResponse.value.explanation;
        }
      } catch {
        // LLM failure is non-fatal; signals still derive from evidence
      }
    }

    const signals = makeMedicalSignals(evidenceResult);
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

/** Singleton factory for the medical verifier. */
export function createMedicalVerifier(): MedicalVerifier {
  return new MedicalVerifier();
}
