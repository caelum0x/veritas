// Scorer: high-level scoring service that dispatches feature vectors to registered models.

import { ok, err, type Result, systemClock } from "@veritas/core";
import type { Model, RawPrediction } from "./model.js";
import type { FeatureVector } from "./feature-vector.js";
import type { MlScoringError } from "./errors.js";
import { ModelNotFoundError, ScoringError } from "./errors.js";

/** Request to score an entity using a specific model. */
export interface ScoringRequest {
  readonly modelId: string;
  readonly featureVector: FeatureVector;
}

/** Result from a successful scoring request. */
export interface ScoringResult {
  readonly modelId: string;
  readonly entityId: string;
  readonly prediction: RawPrediction;
  readonly scoredAt: string;
}

/** Port interface for the scorer service. */
export interface Scorer {
  score(request: ScoringRequest): Promise<Result<ScoringResult, MlScoringError>>;
  scoreBatch(
    requests: ReadonlyArray<ScoringRequest>,
  ): Promise<Result<ReadonlyArray<ScoringResult>, MlScoringError>>;
}

/** In-memory scorer that routes scoring requests to registered Model instances. */
export class InMemoryScorer implements Scorer {
  private readonly models: ReadonlyMap<string, Model>;

  constructor(models: ReadonlyArray<Model>) {
    this.models = new Map(models.map((m) => [m.meta.modelId, m]));
  }

  async score(request: ScoringRequest): Promise<Result<ScoringResult, MlScoringError>> {
    const model = this.models.get(request.modelId);
    if (model === undefined) {
      return err(new ModelNotFoundError(request.modelId));
    }
    const predResult = await model.predict(request.featureVector);
    if (predResult.ok === false) return predResult;
    return ok(
      Object.freeze({
        modelId: request.modelId,
        entityId: request.featureVector.entityId,
        prediction: predResult.value,
        scoredAt: systemClock.nowIso(),
      }),
    );
  }

  async scoreBatch(
    requests: ReadonlyArray<ScoringRequest>,
  ): Promise<Result<ReadonlyArray<ScoringResult>, MlScoringError>> {
    const results: ScoringResult[] = [];
    for (const req of requests) {
      const r = await this.score(req);
      if (r.ok === false) return r;
      results.push(r.value);
    }
    return ok(Object.freeze(results));
  }
}

/** Factory that builds an InMemoryScorer, returning a ScoringError on failure. */
export function makeInMemoryScorer(
  models: ReadonlyArray<Model>,
): Result<InMemoryScorer, MlScoringError> {
  try {
    return ok(new InMemoryScorer(models));
  } catch (cause) {
    return err(new ScoringError("Failed to construct scorer", cause));
  }
}
