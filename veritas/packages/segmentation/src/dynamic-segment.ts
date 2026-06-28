// Dynamic segment — auto-evaluates membership on trait change events.
import { type Result, ok, err, isOk } from "@veritas/core";
import { Segment } from "./segment.js";
import { UserTraits } from "./trait.js";
import { evaluateSegment, EvaluationResult } from "./evaluator.js";
import { SegmentNotFoundError } from "./errors.js";

export interface DynamicSegmentEvent {
  readonly type: "user_traits_updated";
  readonly userId: string;
  readonly traits: UserTraits;
  readonly occurredAt: string;
}

export interface DynamicMembershipChange {
  readonly segmentId: string;
  readonly userId: string;
  readonly previouslyMatched: boolean;
  readonly nowMatched: boolean;
  readonly changedAt: string;
}

/** Given a traits-updated event, re-evaluate all dynamic segments and return changes. */
export function processDynamicSegments(
  segments: ReadonlyArray<Segment>,
  event: DynamicSegmentEvent,
  previousMemberships: ReadonlySet<string>
): ReadonlyArray<DynamicMembershipChange> {
  const dynamic = segments.filter((s) => s.kind === "dynamic");
  return dynamic.map((seg) => {
    const result = evaluateSegment(seg, event.traits, event.occurredAt);
    const nowMatched = isOk(result) ? result.value.matched : false;
    const previouslyMatched = previousMemberships.has(seg.id);
    return Object.freeze({
      segmentId: seg.id,
      userId: event.userId,
      previouslyMatched,
      nowMatched,
      changedAt: event.occurredAt,
    });
  });
}

/** Re-evaluate a single dynamic segment by id, returning an EvaluationResult. */
export function evaluateDynamicSegment(
  segmentId: string,
  segments: ReadonlyArray<Segment>,
  traits: UserTraits,
  now: string
): Result<EvaluationResult, SegmentNotFoundError> {
  const seg = segments.find((s) => s.id === segmentId && s.kind === "dynamic");
  if (!seg) return err(new SegmentNotFoundError(segmentId));
  return evaluateSegment(seg, traits, now);
}

/** Filter only changes where membership actually changed (entered or exited). */
export function filterMembershipChanges(
  changes: ReadonlyArray<DynamicMembershipChange>
): ReadonlyArray<DynamicMembershipChange> {
  return changes.filter((c) => c.previouslyMatched !== c.nowMatched);
}
