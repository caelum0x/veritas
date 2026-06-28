// Dispute event timeline: ordered log of state changes and actions on a dispute.

import { type IsoTimestamp, type Id } from "@veritas/core";
import type { DisputeId, DisputeState } from "./types.js";

export type TimelineEventKind =
  | "opened"
  | "evidence_submitted"
  | "state_changed"
  | "escalated"
  | "arbitration_assigned"
  | "resolved"
  | "closed"
  | "note_added";

export type TimelineEvent = {
  readonly disputeId: DisputeId;
  readonly kind: TimelineEventKind;
  readonly actorId: Id<string>;
  readonly occurredAt: IsoTimestamp;
  readonly detail: Record<string, string | number | boolean | null>;
};

/** Immutable append: returns a new timeline with the event appended. */
export function appendEvent(
  timeline: readonly TimelineEvent[],
  event: TimelineEvent,
): readonly TimelineEvent[] {
  return [...timeline, event];
}

export function buildStateChangeEvent(
  disputeId: DisputeId,
  actorId: Id<string>,
  fromState: DisputeState,
  toState: DisputeState,
  occurredAt: IsoTimestamp,
): TimelineEvent {
  return {
    disputeId,
    kind: "state_changed",
    actorId,
    occurredAt,
    detail: { fromState, toState },
  };
}

export function buildEscalationEvent(
  disputeId: DisputeId,
  actorId: Id<string>,
  fromLevel: string,
  toLevel: string,
  occurredAt: IsoTimestamp,
): TimelineEvent {
  return {
    disputeId,
    kind: "escalated",
    actorId,
    occurredAt,
    detail: { fromLevel, toLevel },
  };
}

export function eventsForDispute(
  timeline: readonly TimelineEvent[],
  disputeId: DisputeId,
): readonly TimelineEvent[] {
  return timeline.filter((e) => e.disputeId === disputeId);
}

export function latestEvent(
  timeline: readonly TimelineEvent[],
  disputeId: DisputeId,
): TimelineEvent | null {
  const events = eventsForDispute(timeline, disputeId);
  return events.length > 0 ? (events[events.length - 1] ?? null) : null;
}
