// Shared value-object schemas and branded types for the lifecycle module.
import { z } from "zod";

export const LifecycleStageId = z.string().brand<"LifecycleStageId">();
export type LifecycleStageId = z.infer<typeof LifecycleStageId>;

export const LifecycleTransitionId = z.string().brand<"LifecycleTransitionId">();
export type LifecycleTransitionId = z.infer<typeof LifecycleTransitionId>;

export const LifecycleTriggerId = z.string().brand<"LifecycleTriggerId">();
export type LifecycleTriggerId = z.infer<typeof LifecycleTriggerId>;

export const LifecycleJourneyId = z.string().brand<"LifecycleJourneyId">();
export type LifecycleJourneyId = z.infer<typeof LifecycleJourneyId>;

export const LifecycleEventId = z.string().brand<"LifecycleEventId">();
export type LifecycleEventId = z.infer<typeof LifecycleEventId>;

/** Stable well-known stages a subject can occupy in its lifecycle. */
export const LifecyclePhase = z.enum([
  "prospect",
  "trial",
  "active",
  "at_risk",
  "churned",
  "reactivated",
  "archived",
]);
export type LifecyclePhase = z.infer<typeof LifecyclePhase>;

/** What kind of entity the lifecycle is tracking. */
export const SubjectKind = z.enum(["user", "organization", "subscription", "claim", "order"]);
export type SubjectKind = z.infer<typeof SubjectKind>;

/** Immutable reference to a lifecycle subject. */
export const SubjectRefSchema = z.object({
  kind: SubjectKind,
  id: z.string().min(1),
});
export type SubjectRef = z.infer<typeof SubjectRefSchema>;

/** Context bag passed to rules and trigger evaluations. */
export const EvalContextSchema = z.object({
  subject: SubjectRefSchema,
  currentPhase: LifecyclePhase,
  metadata: z.record(z.unknown()).default({}),
  occurredAt: z.string().datetime(),
});
export type EvalContext = z.infer<typeof EvalContextSchema>;

/** Outcome produced by a transition rule evaluation. */
export const RuleOutcome = z.enum(["allow", "deny", "skip"]);
export type RuleOutcome = z.infer<typeof RuleOutcome>;

/** Priority tiers used to order rules within a stage. */
export const RulePriority = z.enum(["critical", "high", "normal", "low"]);
export type RulePriority = z.infer<typeof RulePriority>;

export const RULE_PRIORITY_ORDER: Record<RulePriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};
