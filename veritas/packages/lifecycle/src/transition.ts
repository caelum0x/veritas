// Stage transition definitions — allowed moves between lifecycle stages.
import { z } from "zod";
import { type LifecycleStage, LifecycleStageSchema } from "./stage.js";

export const TransitionSchema = z.object({
  from: LifecycleStageSchema,
  to: LifecycleStageSchema,
  label: z.string(),
  requiresApproval: z.boolean(),
});

export type Transition = z.infer<typeof TransitionSchema>;

export type TransitionKey = `${LifecycleStage}->${LifecycleStage}`;

function key(from: LifecycleStage, to: LifecycleStage): TransitionKey {
  return `${from}->${to}`;
}

const ALLOWED_TRANSITIONS: ReadonlyArray<Transition> = [
  { from: "prospect", to: "trial", label: "Start Trial", requiresApproval: false },
  { from: "prospect", to: "active", label: "Direct Purchase", requiresApproval: false },
  { from: "prospect", to: "enterprise_onboarding", label: "Enterprise Sign-up", requiresApproval: true },
  { from: "trial", to: "active", label: "Convert to Paid", requiresApproval: false },
  { from: "trial", to: "churned", label: "Trial Expired", requiresApproval: false },
  { from: "trial", to: "enterprise_onboarding", label: "Upgrade to Enterprise", requiresApproval: true },
  { from: "active", to: "past_due", label: "Payment Failed", requiresApproval: false },
  { from: "active", to: "churned", label: "Cancellation", requiresApproval: false },
  { from: "active", to: "enterprise_onboarding", label: "Upgrade to Enterprise", requiresApproval: true },
  { from: "past_due", to: "active", label: "Payment Recovered", requiresApproval: false },
  { from: "past_due", to: "suspended", label: "Grace Period Expired", requiresApproval: false },
  { from: "suspended", to: "active", label: "Reactivation After Suspension", requiresApproval: false },
  { from: "suspended", to: "churned", label: "Suspension Expired", requiresApproval: false },
  { from: "churned", to: "reactivated", label: "Win-back", requiresApproval: false },
  { from: "reactivated", to: "active", label: "Confirmed Reactivation", requiresApproval: false },
  { from: "reactivated", to: "churned", label: "Re-churned", requiresApproval: false },
  { from: "enterprise_onboarding", to: "enterprise_active", label: "Onboarding Complete", requiresApproval: false },
  { from: "enterprise_onboarding", to: "churned", label: "Onboarding Abandoned", requiresApproval: false },
  { from: "enterprise_active", to: "enterprise_offboarding", label: "Enterprise Cancellation", requiresApproval: true },
  { from: "enterprise_active", to: "past_due", label: "Invoice Past Due", requiresApproval: false },
  { from: "enterprise_offboarding", to: "churned", label: "Offboarding Complete", requiresApproval: false },
  { from: "enterprise_offboarding", to: "enterprise_active", label: "Cancellation Reversed", requiresApproval: true },
];

const TRANSITION_MAP = new Map<TransitionKey, Transition>(
  ALLOWED_TRANSITIONS.map((t) => [key(t.from, t.to), t])
);

export function isTransitionAllowed(
  from: LifecycleStage,
  to: LifecycleStage
): boolean {
  return TRANSITION_MAP.has(key(from, to));
}

export function getTransition(
  from: LifecycleStage,
  to: LifecycleStage
): Transition | undefined {
  return TRANSITION_MAP.get(key(from, to));
}

export function getAllowedTransitionsFrom(
  from: LifecycleStage
): ReadonlyArray<Transition> {
  return ALLOWED_TRANSITIONS.filter((t) => t.from === from);
}

export function getAllowedTransitionsTo(
  to: LifecycleStage
): ReadonlyArray<Transition> {
  return ALLOWED_TRANSITIONS.filter((t) => t.to === to);
}

export function getAllTransitions(): ReadonlyArray<Transition> {
  return ALLOWED_TRANSITIONS;
}
