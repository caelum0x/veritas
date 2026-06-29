// State machine: valid OPEN → UNDER_REVIEW → RESOLVED/ESCALATED/WITHDRAWN transitions.

import { ok, err, type Result } from "@veritas/core";
import { ValidationError } from "@veritas/core";
import { DisputeStatus, type DisputeStatus as DisputeStatusType } from "./dispute.js";

type Transition = `${DisputeStatusType}->${DisputeStatusType}`;

/** All permitted state transitions for a dispute lifecycle. */
const ALLOWED_TRANSITIONS = new Set<Transition>([
  "OPEN->UNDER_REVIEW",
  "OPEN->WITHDRAWN",
  "UNDER_REVIEW->RESOLVED",
  "UNDER_REVIEW->ESCALATED",
  "UNDER_REVIEW->WITHDRAWN",
  "ESCALATED->RESOLVED",
  "ESCALATED->WITHDRAWN",
]);

/** Check whether a transition from `current` to `next` is valid. */
export function isTransitionAllowed(
  current: DisputeStatusType,
  next: DisputeStatusType,
): boolean {
  const key: Transition = `${current}->${next}`;
  return ALLOWED_TRANSITIONS.has(key);
}

/** Validate transition and return ok(next) or err(ValidationError). */
export function transition(
  current: DisputeStatusType,
  next: DisputeStatusType,
): Result<DisputeStatusType, ValidationError> {
  if (isTransitionAllowed(current, next)) {
    return ok(next);
  }
  return err(
    new ValidationError({
      message: `Invalid dispute transition: ${current} → ${next}`,
      details: { current, next },
    }),
  );
}

/** States from which no further transitions are possible. */
export function isTerminal(status: DisputeStatusType): boolean {
  return status === DisputeStatus.RESOLVED || status === DisputeStatus.WITHDRAWN;
}

/** States that require arbitrator assignment. */
export function requiresArbitrator(status: DisputeStatusType): boolean {
  return status === DisputeStatus.UNDER_REVIEW || status === DisputeStatus.ESCALATED;
}
