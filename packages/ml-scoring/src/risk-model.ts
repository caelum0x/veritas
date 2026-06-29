// Risk model: logistic regression model that scores the misinformation risk of a claim.

import { ok, err, type Result, asScore, clampScore } from "@veritas/core";
import type { Model, ModelMeta, RawPrediction } from "./model.js";
import type { FeatureVector } from "./feature-vector.js";
import { getNumeric } from "./feature-vector.js";
import type { MlScoringError } from "./errors.js";
import { ScoringError } from "./errors.js";

/** Feature weights for the risk scoring logistic regression model. */
const RISK_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  contradicting_source_count: 0.28,
  retracted_citations_ratio: 0.32,
  source_credibility_score: -0.25,
  claim_virality_score: 0.18,
  emotional_language_score: 0.15,
  missing_citations_ratio: 0.20,
  previously_debunked_similar: 0.35,
  author_credibility_score: -0.22,
  publication_recency_days: 0.06,
  cross_domain_spread: 0.12,
});

const RISK_BIAS = 0.05;

const RISK_MODEL_META: ModelMeta = Object.freeze({
  modelId: "risk-score-v1",
  name: "Claim Misinformation Risk Model",
  kind: "risk",
  version: "1.0.0",
  featureIds: Object.freeze(Object.keys(RISK_WEIGHTS)),
  createdAt: "2026-01-01T00:00:00.000Z",
  description: "Logistic regression model estimating misinformation risk from claim provenance features.",
});

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function computeLogit(vector: FeatureVector): number {
  return Object.entries(RISK_WEIGHTS).reduce((acc, [featureId, weight]) => {
    return acc + weight * (getNumeric(vector, featureId) ?? 0);
  }, RISK_BIAS);
}

function computeConfidence(vector: FeatureVector): number {
  const total = Object.keys(RISK_WEIGHTS).length;
  const present = Object.keys(RISK_WEIGHTS).filter(
    (fid) => getNumeric(vector, fid) !== undefined,
  ).length;
  return clampScore(present / total);
}

/** In-memory logistic regression model scoring claim misinformation risk. */
export class RiskModel implements Model {
  readonly meta: ModelMeta = RISK_MODEL_META;

  async predict(features: FeatureVector): Promise<Result<RawPrediction, MlScoringError>> {
    try {
      const logit = computeLogit(features);
      const score = asScore(sigmoid(logit));
      const confidence = computeConfidence(features);
      return ok(
        Object.freeze({
          score,
          confidence,
          metadata: Object.freeze({ logit, modelId: this.meta.modelId }),
        }),
      );
    } catch (cause) {
      return err(new ScoringError("Risk model prediction failed", cause));
    }
  }

  async predictBatch(
    featureVectors: ReadonlyArray<FeatureVector>,
  ): Promise<Result<ReadonlyArray<RawPrediction>, MlScoringError>> {
    const results: RawPrediction[] = [];
    for (const fv of featureVectors) {
      const r = await this.predict(fv);
      if (r.ok === false) return r;
      results.push(r.value);
    }
    return ok(Object.freeze(results));
  }
}
