// Domain events emitted by flows-data flows.
import { makeDomainEvent, type DomainEvent } from "@veritas/core";

export type EtlLoadCompletedEvent = DomainEvent<
  "etl.load.completed",
  { readonly loaded: number; readonly failed: number; readonly skipped: number }
>;

export type ReportGeneratedEvent = DomainEvent<
  "report.generated",
  { readonly reportId: string; readonly organizationId: string }
>;

export type UsageRollupCompletedEvent = DomainEvent<
  "usage.rollup.completed",
  { readonly date: string; readonly organizationId: string | undefined; readonly total: number }
>;

export type VerificationAnalyticsStoredEvent = DomainEvent<
  "verification.analytics.stored",
  { readonly reportId: string; readonly eventCount: number }
>;

export function makeEtlLoadCompletedEvent(
  payload: EtlLoadCompletedEvent["payload"],
): EtlLoadCompletedEvent {
  return makeDomainEvent({ type: "etl.load.completed", payload });
}

export function makeReportGeneratedEvent(
  payload: ReportGeneratedEvent["payload"],
): ReportGeneratedEvent {
  return makeDomainEvent({ type: "report.generated", payload });
}

export function makeUsageRollupCompletedEvent(
  payload: UsageRollupCompletedEvent["payload"],
): UsageRollupCompletedEvent {
  return makeDomainEvent({ type: "usage.rollup.completed", payload });
}

export function makeVerificationAnalyticsStoredEvent(
  payload: VerificationAnalyticsStoredEvent["payload"],
): VerificationAnalyticsStoredEvent {
  return makeDomainEvent({ type: "verification.analytics.stored", payload });
}
