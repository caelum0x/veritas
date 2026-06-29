// Survey trigger logic — evaluates whether a user should be shown an NPS survey.
import { Result, ok, err } from "@veritas/core";
import { Survey } from "./survey.js";
import { NpsResponse } from "./response.js";
import { TriggerType } from "./types.js";

export interface TriggerContext {
  readonly userId: string;
  readonly event: TriggerType;
  readonly occurredAt: string;
  /** Arbitrary event metadata (e.g. plan name, milestone key) */
  readonly metadata: Readonly<Record<string, string>>;
}

export interface TriggerDecision {
  readonly shouldShow: boolean;
  readonly surveyId: string | undefined;
  readonly delayMs: number;
  readonly reason: string;
}

const isOnCooldown = (
  lastResponse: NpsResponse | undefined,
  cooldownDays: number
): boolean => {
  if (!lastResponse) return false;
  const elapsed = Date.now() - Date.parse(lastResponse.createdAt);
  return elapsed < cooldownDays * 24 * 60 * 60 * 1000;
};

const matchesSegment = (
  survey: Survey,
  ctx: TriggerContext
): boolean => {
  if (!survey.targetSegment) return true;
  return Object.entries(survey.targetSegment).every(
    ([k, v]) => ctx.metadata[k] === v
  );
};

export const evaluateTrigger = (
  surveys: readonly Survey[],
  responses: readonly NpsResponse[],
  ctx: TriggerContext
): Result<TriggerDecision, Error> => {
  if (!ctx.userId || !ctx.event) {
    return err(new Error("TriggerContext must include userId and event"));
  }

  const eligible = surveys.filter(
    (s) => s.state === "active" && s.triggerType === ctx.event && matchesSegment(s, ctx)
  );

  if (eligible.length === 0) {
    return ok({ shouldShow: false, surveyId: undefined, delayMs: 0, reason: "no_matching_survey" });
  }

  // Pick the first eligible survey; deterministic ordering by createdAt.
  const sorted = [...eligible].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  );

  for (const survey of sorted) {
    const userResponses = responses
      .filter((r) => r.userId === ctx.userId && r.surveyId === survey.id)
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

    const lastResponse = userResponses[0];

    if (isOnCooldown(lastResponse, survey.cooldownDays)) {
      continue;
    }

    return ok({
      shouldShow: true,
      surveyId: survey.id,
      delayMs: survey.delayMs,
      reason: "eligible",
    });
  }

  return ok({ shouldShow: false, surveyId: undefined, delayMs: 0, reason: "cooldown" });
};

export const buildTriggerContext = (
  userId: string,
  event: TriggerType,
  metadata: Record<string, string> = {}
): TriggerContext => ({
  userId,
  event,
  occurredAt: new Date().toISOString(),
  metadata: Object.freeze({ ...metadata }),
});
