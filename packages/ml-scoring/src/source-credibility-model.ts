// Source credibility model: scores the trustworthiness of a source entity using logistic regression.

import { ok, err, type Result, asScore, clampScore } from "@veritas/core";
import type { Model, ModelMeta, RawPrediction } from "./model.js";
import type { FeatureVector } from "./feature-vector.js";
import { getNumeric } from "./feature-vector.js";
import type { MlScoringError } from "./errors.js";
import { ScoringError } from "./errors.js";

/** Weights for the source credibility logistic regression model. */
const CREDIBILITY_WEIGHTS: Readonly<Record<string, number>> = Object.freeze({
  domain_age_years: 0.12,
  citations_count: 0.18,
  peer_review_ratio: 0.25,
  correction_ratio: -0.20,
  retraction_ratio: -0.35,
  author_h_index: 0.15,
  institutional_affiliation: 0.10,
  verified_sources_ratio: 0.22,
  broken_links_ratio: -0.14,
  social_amplification: 0.08,
});

const BIAS_TERM = -0.05;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function computeLogit(vector: FeatureVector): number {
  return Object.entries(CREDIBILITY_WEIGHTS).reduce((acc, [featureId, weight]) => {
    const val = getNumeric(vector, featureId) ?? 0;
    return acc + weight * val;
  }, BIAS_TERM);
}

function computeConfidence(vector: FeatureVector): number {
  const present = Object.keys(CREDIBILITY_WEIGHTS).filter(
    (fid) => getNumeric(vector, fid) !== undefined,
  ).length;
  return clampScore(present / Object.keys(CREDIBILITY_WEIGHTS).length);
}

const SOURCE_CREDIBILITY_META: ModelMeta = Object.freeze({
  modelId: "source-credibility-v1",
  name: "Source Credibility Model",
  kind: "source-credibility",
  version: "1.0.0",
  featureIds: Object.freeze(Object.keys(CREDIBILITY_WEIGHTS)),
  createdAt: "2026-01-01T00:00:00.000Z",
  description: "Logistic regression model estimating source credibility from provenance features.",
});

/** In-memory logistic regression model for source credibility scoring. */
export class SourceCredibilityModel implements Model {
  readonly meta: ModelMeta = SOURCE_CREDIBILITY_META;

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
      return err(new ScoringError("Source credibility prediction failed", cause));
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
