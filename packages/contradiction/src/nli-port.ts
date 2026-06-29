// Port interface for natural-language inference (NLI) — swap implementations freely.
import type { Result } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { ClaimPair } from "./pair.js";
import type { NliScore } from "./relation.js";

export interface NliOptions {
  /** Abort signal for cooperative cancellation */
  readonly signal?: AbortSignal;
  /** Override threshold for contradiction decision (default 0.5) */
  readonly contradictionThreshold?: number;
}

/**
 * NliPort: minimal interface every NLI backend must satisfy.
 * Implementations: LlmNli (LLM-backed), MockNli (deterministic for tests).
 */
export interface NliPort {
  readonly name: string;
  /**
   * Classify the NLI relation between premise and hypothesis in the pair.
   * Returns the pair enriched with nliScore on success.
   */
  classify(
    pair: ClaimPair,
    options?: NliOptions,
  ): Promise<Result<ClaimPair, AppError>>;

  /**
   * Batch classify multiple pairs; order of results matches input order.
   */
  classifyBatch(
    pairs: ReadonlyArray<ClaimPair>,
    options?: NliOptions,
  ): Promise<Result<ReadonlyArray<ClaimPair>, AppError>>;
}

/** Mock NLI that returns neutral for every pair — useful in unit tests. */
export class MockNli implements NliPort {
  readonly name = "mock-nli";

  private readonly fixedRelation: "entailment" | "contradiction" | "neutral";

  constructor(
    fixedRelation: "entailment" | "contradiction" | "neutral" = "neutral",
  ) {
    this.fixedRelation = fixedRelation;
  }

  async classify(
    pair: ClaimPair,
    _options?: NliOptions,
  ): Promise<Result<ClaimPair, AppError>> {
    const { ok } = await import("@veritas/core");
    const score: NliScore = {
      relation: this.fixedRelation,
      confidence: 0.9,
      scores: {
        entailment: this.fixedRelation === "entailment" ? 0.9 : 0.05,
        contradiction: this.fixedRelation === "contradiction" ? 0.9 : 0.05,
        neutral: this.fixedRelation === "neutral" ? 0.9 : 0.05,
      },
    };
    const { withScore } = await import("./pair.js");
    return ok(withScore(pair, score));
  }

  async classifyBatch(
    pairs: ReadonlyArray<ClaimPair>,
    options?: NliOptions,
  ): Promise<Result<ReadonlyArray<ClaimPair>, AppError>> {
    const { ok, err, isErr } = await import("@veritas/core");
    const results: ClaimPair[] = [];
    for (const pair of pairs) {
      const r = await this.classify(pair, options);
      if (isErr(r)) return err(r.error);
      results.push(r.value);
    }
    return ok(results);
  }
}
