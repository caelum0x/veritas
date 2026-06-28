// Retention interventions triggered by churn risk scores.
import { ok, err, Result, Clock, systemClock, newId } from '@veritas/core';
import type { UserId } from '@veritas/core';
import type { Intervention, InterventionType, InterventionStatus, RiskScore } from './types.js';
import { InterventionAlreadyExistsError, InterventionNotFoundError } from './errors.js';
import type { ChurnStore } from './store.js';

const INTERVENTION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function chooseInterventionType(risk: RiskScore): InterventionType {
  if (risk.score >= 0.9) return 'success_call';
  if (risk.score >= 0.75) return 'discount_offer';
  if (risk.score >= 0.55) return 'email_campaign';
  if (risk.score >= 0.35) return 'feature_highlight';
  return 'plan_downgrade_offer';
}

function buildMetadata(risk: RiskScore): Readonly<Record<string, unknown>> {
  return {
    riskScore: risk.score,
    riskLevel: risk.risk,
    factors: risk.factors,
  };
}

export async function triggerIntervention(
  userId: UserId,
  risk: RiskScore,
  store: ChurnStore,
  clock: Clock = systemClock,
): Promise<Result<Intervention>> {
  const existingResult = await store.listInterventions(userId);
  if (!existingResult.ok) return existingResult as Result<Intervention>;

  const type = chooseInterventionType(risk);
  const hasActive = existingResult.value.some(
    (i) => i.type === type && (i.status === 'pending' || i.status === 'sent'),
  );
  if (hasActive) return err(new InterventionAlreadyExistsError(userId, type));

  const nowMs = clock.now();
  const nowIso = clock.nowIso();
  const intervention: Intervention = {
    id: newId('intervention'),
    userId,
    type,
    status: 'pending',
    triggeredAt: nowIso,
    expiresAt: new Date(nowMs + INTERVENTION_TTL_MS).toISOString(),
    metadata: buildMetadata(risk),
  };

  const saveResult = await store.saveIntervention(intervention);
  if (!saveResult.ok) return saveResult as Result<Intervention>;
  return ok(intervention);
}

export async function updateInterventionStatus(
  id: string,
  status: InterventionStatus,
  store: ChurnStore,
): Promise<Result<Intervention>> {
  return store.updateIntervention(id, { status });
}

export async function listUserInterventions(
  userId: UserId,
  store: ChurnStore,
): Promise<Result<ReadonlyArray<Intervention>>> {
  return store.listInterventions(userId);
}

export async function getIntervention(
  id: string,
  store: ChurnStore,
): Promise<Result<Intervention>> {
  return store.getIntervention(id);
}

export async function expireStaleInterventions(
  store: ChurnStore,
  clock: Clock = systemClock,
): Promise<Result<number>> {
  const scoresResult = await store.listRiskScores();
  if (!scoresResult.ok) return scoresResult as Result<number>;

  const nowIso = clock.nowIso();
  let expiredCount = 0;

  for (const riskScore of scoresResult.value) {
    const interventionsResult = await store.listInterventions(riskScore.userId as UserId);
    if (!interventionsResult.ok) continue;

    for (const intervention of interventionsResult.value) {
      if (
        (intervention.status === 'pending' || intervention.status === 'sent') &&
        intervention.expiresAt < nowIso
      ) {
        await store.updateIntervention(intervention.id, { status: 'expired' });
        expiredCount++;
      }
    }
  }

  return ok(expiredCount);
}
