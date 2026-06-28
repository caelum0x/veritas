// Incident timeline — ordered log of events and actions during an incident.
import { z } from "zod";
import { newId } from "@veritas/core";

export const TimelineEventKindSchema = z.enum([
  "detected",
  "declared",
  "acknowledged",
  "responder_added",
  "responder_released",
  "severity_changed",
  "status_changed",
  "escalated",
  "note_added",
  "resolved",
  "postmortem_started",
  "postmortem_completed",
]);
export type TimelineEventKind = z.infer<typeof TimelineEventKindSchema>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  kind: TimelineEventKindSchema,
  occurredAt: z.string(),
  authorId: z.string().nullable(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export interface AddTimelineEventOptions {
  readonly incidentId: string;
  readonly kind: TimelineEventKind;
  readonly occurredAt: string;
  readonly authorId?: string | null;
  readonly message: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function createTimelineEvent(opts: AddTimelineEventOptions): TimelineEvent {
  return {
    id: newId("tl"),
    incidentId: opts.incidentId,
    kind: opts.kind,
    occurredAt: opts.occurredAt,
    authorId: opts.authorId ?? null,
    message: opts.message,
    metadata: opts.metadata ?? {},
  };
}

export function sortTimelineAsc(events: readonly TimelineEvent[]): readonly TimelineEvent[] {
  return [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

export function sortTimelineDesc(events: readonly TimelineEvent[]): readonly TimelineEvent[] {
  return [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function filterByKind(
  events: readonly TimelineEvent[],
  kinds: readonly TimelineEventKind[],
): readonly TimelineEvent[] {
  const set = new Set(kinds);
  return events.filter((e) => set.has(e.kind));
}

export function getFirstEvent(
  events: readonly TimelineEvent[],
  kind: TimelineEventKind,
): TimelineEvent | undefined {
  return sortTimelineAsc(events).find((e) => e.kind === kind);
}

export function buildSummaryLog(events: readonly TimelineEvent[]): string {
  return sortTimelineAsc(events)
    .map((e) => `[${e.occurredAt}] ${e.kind}: ${e.message}`)
    .join("\n");
}
