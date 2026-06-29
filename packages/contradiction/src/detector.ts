// Detect contradictions across a set of claims using an NLI port + pairwise matrix.
import { ok, err, isErr } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import type { NliPort } from "./nli-port.js";
import { makePair } from "./pair.js";
import type { ClaimText } from "./pair.js";
import { isContradiction } from "./relation.js";
import { clusterContradictions } from "./cluster.js";
import type { ContradictionCluster } from "./cluster.js";
import type { Contradiction, DetectionContext, ContradictionSeverity } from "./types.js";
import { newId } from "@veritas/core";

function buildSeverity(confidence: number): ContradictionSeverity {
  if (confidence >= 0.9) return "critical";
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/**
 * Detect contradictions among a list of claims.
 * Generates O(n²) pairs and classifies each via the NLI port.
 */
export async function detectContradictions(
  claims: ReadonlyArray<ClaimText>,
  nli: NliPort,
  ctx: DetectionContext = {},
): Promise<Result<{ totalPairs: number; contradictionsFound: number; contradictions: ReadonlyArray<Contradiction>; clusters: ReadonlyArray<ContradictionCluster> }, AppError>> {
  const threshold = ctx.contradictionThreshold ?? 0.5;
  const pairs = [];

  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      pairs.push(makePair(claims[i]!, claims[j]!));
    }
  }

  const maxPairs = ctx.maxPairs ?? 500;
  const limited = pairs.slice(0, maxPairs);

  const batchResult = await nli.classifyBatch(limited, {
    signal: ctx.signal,
    contradictionThreshold: threshold,
  });

  if (isErr(batchResult)) return err(batchResult.error);

  const scored = batchResult.value;
  const contradictions: Contradiction[] = [];

  for (const pair of scored) {
    const score = pair.nliScore;
    if (score && isContradiction(score) && score.confidence >= threshold) {
      contradictions.push({
        id: newId("contradiction"),
        premise: pair.premise,
        hypothesis: pair.hypothesis,
        nliScore: score,
        severity: buildSeverity(score.confidence),
        status: "open",
        detectedAt: new Date().toISOString(),
      });
    }
  }

  const clusters: ReadonlyArray<ContradictionCluster> = clusterContradictions(scored, threshold);

  return ok({
    totalPairs: limited.length,
    contradictionsFound: contradictions.length,
    contradictions,
    clusters,
  });
}
