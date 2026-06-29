// Per-citation stance detection: classifies each evidence snippet against the claim
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { LLMStancePort } from "./llm-stance.js";
import { StanceDetectionError } from "./errors.js";
import { fromEvidenceStance } from "./stance.js";
import type { CitationStance, StanceContext } from "./types.js";

/** Raw citation input for stance detection */
export interface CitationInput {
  readonly citationId: string;
  readonly sourceId:   string | null;
  readonly url:        string | null;
  readonly snippet:    string;
  /** Authority weight [0,1] from source tier (default 1.0) */
  readonly weight?:    number;
  /** Pre-computed stance from evidence schema (optional fast path) */
  readonly rawStance?: "supports" | "refutes" | "neutral";
}

/** Classify a single citation's stance toward the claim via LLM */
export async function classifyCitationStance(
  citation: CitationInput,
  ctx: StanceContext,
  port: LLMStancePort,
): Promise<Result<CitationStance, StanceDetectionError>> {
  // Fast path: use pre-computed stance if available with lower confidence
  if (citation.rawStance !== undefined) {
    return ok({
      citationId:  citation.citationId,
      sourceId:    citation.sourceId,
      url:         citation.url,
      snippet:     citation.snippet,
      stance:      fromEvidenceStance(citation.rawStance),
      confidence:  0.6,
      reasoning:   "derived from evidence schema stance field",
      weight:      citation.weight ?? 1.0,
    });
  }

  const result = await port.classify(ctx.claimText, citation.snippet, ctx.modelId);
  if (!result.ok) {
    return err(new StanceDetectionError(
      `Stance classification failed for citation ${citation.citationId}`,
      result.error,
    ));
  }
  const { stance, confidence, reasoning } = result.value;
  return ok({
    citationId:  citation.citationId,
    sourceId:    citation.sourceId,
    url:         citation.url,
    snippet:     citation.snippet,
    stance,
    confidence,
    reasoning:   reasoning ?? "",
    weight:      citation.weight ?? 1.0,
  });
}

/** Classify stances for multiple citations, collecting errors per-item */
export async function classifyAllCitationStances(
  citations: ReadonlyArray<CitationInput>,
  ctx: StanceContext,
  port: LLMStancePort,
  concurrency = 4,
): Promise<{ stances: CitationStance[]; errors: StanceDetectionError[] }> {
  const stances: CitationStance[] = [];
  const errors: StanceDetectionError[] = [];

  // Process in batches to respect concurrency limit
  for (let i = 0; i < citations.length; i += concurrency) {
    const batch = citations.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((c) => classifyCitationStance(c, ctx, port)),
    );
    for (const r of results) {
      if (r.ok) stances.push(r.value);
      else       errors.push(r.error);
    }
  }
  return { stances, errors };
}
