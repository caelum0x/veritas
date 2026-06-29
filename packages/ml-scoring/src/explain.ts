// Feature importance explainer: computes per-feature contribution scores via perturbation.

import { ok, err, type Result, asScore } from "@veritas/core";
import type { Model, RawPrediction } from "./model.js";
import type { FeatureVector } from "./feature-vector.js";
import { makeFeatureVector } from "./feature-vector.js";
import type { MlScoringError } from "./errors.js";
import { ExplainabilityError } from "./errors.js";

/** Importance of a single feature in a prediction. */
export interface FeatureContribution {
  readonly featureId: string;
  /** Signed score delta when this feature is zeroed out: positive means it raised the score. */
  readonly contribution: number;
  readonly direction: "positive" | "negative" | "neutral";
}

/** Full explanation for a single prediction. */
export interface PredictionExplanation {
  readonly entityId: string;
  readonly modelId: string;
  readonly baselineScore: number;
  readonly score: number;
  readonly contributions: ReadonlyArray<FeatureContribution>;
}

function featureEntriesToRecord(features: Readonly<Record<string, number>>): Record<string, number> {
  return { ...features };
}

function direction(contribution: number): "positive" | "negative" | "neutral" {
  if (contribution > 0.001) return "positive";
  if (contribution < -0.001) return "negative";
  return "neutral";
}

/**
 * Compute feature importance by individually zeroing each feature and measuring
 * the change in prediction score (perturbation / ablation approach).
 */
export async function explainPrediction(
  model: Model,
  vector: FeatureVector,
  baseline?: RawPrediction,
): Promise<Result<PredictionExplanation, MlScoringError>> {
  const baselineResult = baseline
    ? ok(baseline)
    : await model.predict(vector);

  if (baselineResult.ok === false) {
    return err(new ExplainabilityError("Baseline prediction failed for explanation", baselineResult.error));
  }

  const baselinePred = baselineResult.value;
  const originalValues = featureEntriesToRecord(vector.features);
  const contributions: FeatureContribution[] = [];

  for (const featureId of Object.keys(originalValues)) {
    const ablated = { ...originalValues, [featureId]: 0 };
    const ablatedVector = makeFeatureVector(
      vector.entityId,
      ablated,
      vector.timestamp,
    );

    const ablatedResult = await model.predict(ablatedVector);
    if (ablatedResult.ok === false) {
      return err(new ExplainabilityError(`Ablation failed for feature ${featureId}`, ablatedResult.error));
    }

    const contrib = baselinePred.score - ablatedResult.value.score;
    contributions.push(
      Object.freeze({
        featureId,
        contribution: contrib,
        direction: direction(contrib),
      }),
    );
  }

  const sorted = Object.freeze(
    [...contributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
  );

  return ok(
    Object.freeze({
      entityId: vector.entityId,
      modelId: model.meta.modelId,
      baselineScore: asScore(0),
      score: baselinePred.score,
      contributions: sorted,
    }),
  );
}

/** Summarize the top-N most influential features from an explanation. */
export function topContributions(
  explanation: PredictionExplanation,
  n: number,
): ReadonlyArray<FeatureContribution> {
  return Object.freeze(explanation.contributions.slice(0, n));
}
