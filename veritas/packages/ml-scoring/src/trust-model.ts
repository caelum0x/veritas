// Trust model: logistic regression model that scores claim trustworthiness from evidence features.

import { ok, err, type Result, asScore, clampScore } from "@veritas/core";
import type { Model, ModelMeta, RawPrediction } from "./model.js";
import type { FeatureVector } from "./feature-vector.js";
import { getNumeric } from "./feature-vector.js";
import type { MlScoringError } from "./errors.js";
import { ScoringError } from "./errors.js";

/** Feature weights for the trust scoring logistic regression model. */
const TRUST_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  source_credibility_score: 0.30,
  evidence_count: 0.15,
  corroborating_source_count: 0.18,
  contradicting_source_count: -0.22,
  claim_age_days: -0.05,
  verified_citations_ratio: 0.25,
  retracted_citations_ratio: -0.28,
  expert_endorsement_count: 0.20,
  social_spread_velocity: 0.08,
  publisher_trust_tier: 0.17,
});

const TRUST_BIAS = -0.10;

const TRUST_MODEL_META: ModelMeta = Object.freeze({
  modelId: "trust-score-v1",
  name: "Claim Trust Score Model",
  kind: "trust",
  version: "1.0.0",
  featureIds: Object.freeze(Object.keys(TRUST_WEIGHTS)),
  createdAt: "2026-01-01T00:00:00.000Z",
  description: "Logistic regression model that scores claim trustworthiness from evidence features.",
});

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function computeLogit(vector: FeatureVector): number {
  return Object.entries(TRUST_WEIGHTS).reduce((acc, [featureId, weight]) => {
    return acc + weight * (getNumeric(vector, featureId) ?? 0);
  }, TRUST_BIAS);
}

function computeConfidence(vector: FeatureVector): number {
  const total = Object.keys(TRUST_WEIGHTS).length;
  const present = Object.keys(TRUST_WEIGHTS).filter(
    (fid) => getNumeric(vector, fid) !== undefined,
  ).length;
  return clampScore(present / total);
}

/** In-memory logistic regression model scoring claim trustworthiness. */
export class TrustModel implements Model {
  readonly meta: ModelMeta = TRUST_MODEL_META;

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
      return err(new ScoringError("Trust model prediction failed", cause));
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
