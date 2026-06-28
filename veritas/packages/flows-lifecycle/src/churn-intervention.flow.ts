// Flow: predict churn from account signals, trigger retention intervention when risk is elevated.
import { ok, err, type Result, type UserId, type Clock } from "@veritas/core";
import {
  predictChurn,
  type ChurnPrediction,
  type AccountActivity,
  type ChurnSignal,
  type ChurnStore,
  type Intervention,
} from "@veritas/churn";
import { type Logger } from "@veritas/observability";

export interface ChurnInterventionDeps {
  readonly churnStore: ChurnStore;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface ChurnInterventionInput {
  readonly userId: UserId;
  readonly accountId: string;
  readonly signals: ReadonlyArray<ChurnSignal>;
  readonly activity: AccountActivity;
}

export interface ChurnInterventionOutput {
  readonly prediction: ChurnPrediction;
  readonly intervention: Intervention | null;
  readonly alreadyActive: boolean;
}

export type ChurnInterventionError = Error;

function selectInterventionType(
  prediction: ChurnPrediction,
): Intervention["type"] {
  if (prediction.churnProbability >= 0.85) return "success_call";
  if (prediction.churnProbability >= 0.7) return "discount_offer";
  if (prediction.churnProbability >= 0.5) return "email_campaign";
  return "feature_highlight";
}

export async function churnInterventionFlow(
  input: ChurnInterventionInput,
  deps: ChurnInterventionDeps,
): Promise<Result<ChurnInterventionOutput, ChurnInterventionError>> {
  const { churnStore, clock, logger } = deps;

  const now = clock.nowIso();

  const predictionResult = predictChurn(input.activity, input.signals);
  if (!predictionResult.ok) {
    return err(predictionResult.error as unknown as Error);
  }
  const prediction = predictionResult.value;

  logger.info("Churn prediction computed", {
    userId: input.userId,
    accountId: input.accountId,
    probability: String(prediction.churnProbability),
    riskBand: prediction.riskBand,
  });

  if (prediction.riskBand === "low") {
    return ok({ prediction, intervention: null, alreadyActive: false });
  }

  const type = selectInterventionType(prediction);
  const existingResult = await churnStore.listInterventions(input.userId);
  if (!existingResult.ok) return err(existingResult.error as unknown as Error);

  const hasActive = existingResult.value.some(
    (i) => i.type === type && (i.status === "pending" || i.status === "sent"),
  );
  if (hasActive) {
    logger.info("Intervention already active", { userId: input.userId, type });
    return ok({ prediction, intervention: null, alreadyActive: true });
  }

  const ttlMs = 7 * 24 * 60 * 60 * 1000;
  const intervention: Intervention = {
    id: `intv_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    userId: input.userId,
    type,
    status: "pending",
    triggeredAt: now,
    expiresAt: new Date(clock.now() + ttlMs).toISOString(),
    metadata: {
      churnProbability: prediction.churnProbability,
      riskBand: prediction.riskBand,
      topFactors: prediction.topFactors,
    },
  };

  const saveResult = await churnStore.saveIntervention(intervention);
  if (!saveResult.ok) return err(saveResult.error as unknown as Error);

  logger.info("Churn intervention triggered", {
    userId: input.userId,
    interventionId: intervention.id,
    type: intervention.type,
  });

  return ok({ prediction, intervention, alreadyActive: false });
}
