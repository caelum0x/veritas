// Churn predictor: combines feature vector with risk score into a final churn prediction
import { z } from "zod";
import { ok, err, type Result, ValidationError } from "@veritas/core";
import { type FeatureVector, normalizeFeatures, type AccountActivity, extractFeatures } from "./features.js";
import { computeRiskScore, type RiskScore, toBand } from "./risk-score.js";
import { type ChurnSignal } from "./signal.js";

export const ChurnPredictionSchema = z.object({
  accountId: z.string(),
  churnProbability: z.number().min(0).max(1),
  riskBand: z.enum(["low", "medium", "high", "critical"]),
  topFactors: z.array(z.string()).max(5),
  riskScore: z.number().min(0).max(1),
  recommendedAction: z.enum(["monitor", "engage", "escalate", "retain"]),
  predictedAt: z.string().datetime(),
});
export type ChurnPrediction = z.infer<typeof ChurnPredictionSchema>;

/** Static linear weights for each normalised feature */
const FEATURE_WEIGHTS: Record<string, number> = {
  daysSinceLogin: 0.2,
  volumeTrend: -0.25, // negative: higher trend = lower churn
  supportTickets30d: 0.15,
  paymentFailures90d: 0.25,
  viewedCancellationPage: 0.3,
  npsScore: -0.2,  // negative: higher NPS = lower churn
  totalSignalWeight30d: 0.2,
  distinctSignalKinds: 0.15,
};

const recommendAction = (prob: number): ChurnPrediction["recommendedAction"] => {
  if (prob >= 0.75) return "retain";
  if (prob >= 0.55) return "escalate";
  if (prob >= 0.35) return "engage";
  return "monitor";
};

const topFactorsFromNormalized = (
  normalized: Record<string, number>,
): string[] => {
  const contributions = Object.entries(FEATURE_WEIGHTS)
    .map(([key, w]) => ({ key, contrib: (normalized[key] ?? 0) * Math.abs(w) }))
    .filter(({ contrib }) => contrib > 0.01)
    .sort((a, b) => b.contrib - a.contrib);
  return contributions.slice(0, 5).map(({ key }) => key);
};

const BIAS = 0.05;

/** Compute churn probability from a normalised feature map using a linear model */
const linearProbability = (normalized: Record<string, number>): number => {
  let logit = BIAS;
  for (const [key, w] of Object.entries(FEATURE_WEIGHTS)) {
    logit += (normalized[key] ?? 0) * w;
  }
  return 1 / (1 + Math.exp(-logit * 4)); // scaled sigmoid
};

/** Blend feature-model probability with signal-derived risk score */
const blendProbabilities = (modelProb: number, riskScore: number): number => {
  const blended = 0.6 * modelProb + 0.4 * riskScore;
  return Math.min(Math.max(blended, 0), 1);
};

/** Predict churn for a single account */
export const predictChurn = (
  activity: AccountActivity,
  signals: readonly ChurnSignal[],
): Result<ChurnPrediction, ValidationError> => {
  const fv = extractFeatures(activity, signals);
  const normalized = normalizeFeatures(fv);
  const riskScore = computeRiskScore(activity.accountId, signals);

  const modelProb = linearProbability(normalized);
  const churnProbability = blendProbabilities(modelProb, riskScore.score);

  const prediction: ChurnPrediction = {
    accountId: activity.accountId,
    churnProbability,
    riskBand: toBand(churnProbability),
    topFactors: topFactorsFromNormalized(normalized),
    riskScore: riskScore.score,
    recommendedAction: recommendAction(churnProbability),
    predictedAt: new Date().toISOString(),
  };

  return ok(prediction);
};

/** Batch predict churn for multiple accounts */
export const batchPredictChurn = (
  activities: readonly AccountActivity[],
  signals: readonly ChurnSignal[],
): ChurnPrediction[] => {
  const results: ChurnPrediction[] = [];
  for (const activity of activities) {
    const result = predictChurn(activity, signals);
    if (result.ok) results.push(result.value);
  }
  return results;
};
