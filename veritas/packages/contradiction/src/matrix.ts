// matrix.ts: pairwise NLI matrix over a set of claims for batch contradiction analysis.
import { ok, err, isErr, newId } from "@veritas/core";
import type { Result, AppError } from "@veritas/core";
import type { NliPort, NliOptions } from "./nli-port.js";
import { makePair } from "./pair.js";
import type { ClaimText, ClaimPair } from "./pair.js";
import type { NliRelation, NliScore } from "./relation.js";
import { MatrixBuildError, TooManyPairsError } from "./errors.js";

/** A single cell in the pairwise matrix. */
export interface MatrixCell {
  readonly rowId: string;
  readonly colId: string;
  readonly pair: ClaimPair;
  readonly relation: NliRelation;
  readonly confidence: number;
}

/** The full pairwise NLI matrix for a claim set. */
export interface PairwiseMatrix {
  readonly matrixId: string;
  readonly claimIds: ReadonlyArray<string>;
  readonly cells: ReadonlyArray<MatrixCell>;
  readonly totalPairs: number;
  readonly contradictionCount: number;
  readonly entailmentCount: number;
  readonly neutralCount: number;
}

export interface MatrixOptions {
  readonly maxClaims?: number;
  readonly contradictionThreshold?: number;
  readonly signal?: AbortSignal;
}

const DEFAULT_MAX_CLAIMS = 50; // 50 claims → 1225 pairs max

/**
 * Build a full pairwise NLI matrix from a list of claims.
 * O(n²) pairs are generated and classified via the NLI port in a single batch call.
 */
export async function buildPairwiseMatrix(
  claims: ReadonlyArray<ClaimText>,
  nli: NliPort,
  opts: MatrixOptions = {},
): Promise<Result<PairwiseMatrix, AppError>> {
  const maxClaims = opts.maxClaims ?? DEFAULT_MAX_CLAIMS;

  if (claims.length > maxClaims) {
    return err(new TooManyPairsError(claims.length, maxClaims));
  }

  const pairs: ClaimPair[] = [];
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      pairs.push(makePair(claims[i]!, claims[j]!));
    }
  }

  const nliOpts: NliOptions = {
    signal: opts.signal,
    contradictionThreshold: opts.contradictionThreshold,
  };

  const batchResult = await nli.classifyBatch(pairs, nliOpts);
  if (isErr(batchResult)) {
    return err(
      new MatrixBuildError(batchResult.error.message),
    );
  }

  const scored = batchResult.value;
  const cells: MatrixCell[] = [];
  let contradictionCount = 0;
  let entailmentCount = 0;
  let neutralCount = 0;

  for (const pair of scored) {
    const score: NliScore = pair.nliScore ?? {
      relation: "neutral",
      confidence: 0,
    };
    const cell: MatrixCell = {
      rowId: pair.premise.id,
      colId: pair.hypothesis.id,
      pair,
      relation: score.relation,
      confidence: score.confidence,
    };
    cells.push(cell);
    if (score.relation === "contradiction") contradictionCount++;
    else if (score.relation === "entailment") entailmentCount++;
    else neutralCount++;
  }

  const claimIds = claims.map((c) => c.id);

  return ok({
    matrixId: newId("matrix"),
    claimIds,
    cells,
    totalPairs: cells.length,
    contradictionCount,
    entailmentCount,
    neutralCount,
  });
}

/** Extract only contradicting cells from a matrix. */
export function getContradictingCells(
  matrix: PairwiseMatrix,
  threshold = 0.5,
): ReadonlyArray<MatrixCell> {
  return matrix.cells.filter(
    (c) => c.relation === "contradiction" && c.confidence >= threshold,
  );
}

/** Look up the matrix cell for a specific (rowId, colId) pair, if it exists. */
export function lookupCell(
  matrix: PairwiseMatrix,
  rowId: string,
  colId: string,
): MatrixCell | undefined {
  return matrix.cells.find(
    (c) =>
      (c.rowId === rowId && c.colId === colId) ||
      (c.rowId === colId && c.colId === rowId),
  );
}

/** Summarize the matrix as a relation-count record keyed by relation. */
export function summarizeMatrix(
  matrix: PairwiseMatrix,
): Record<NliRelation, number> {
  return {
    contradiction: matrix.contradictionCount,
    entailment: matrix.entailmentCount,
    neutral: matrix.neutralCount,
  };
}
