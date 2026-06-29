// Export filter: predicate-based filtering of audit events by time, category, severity, actor, and resource.

import { Result, ok, err } from "@veritas/core";
import { type AuditEvent, type ExportFilter, ExportFilterSchema } from "./types.js";
import { FilterValidationError } from "./errors.js";

export function validateFilter(raw: unknown): Result<ExportFilter, FilterValidationError> {
  const parsed = ExportFilterSchema.safeParse(raw);
  if (!parsed.success) {
    return err(
      new FilterValidationError(
        `Invalid export filter: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
      ),
    );
  }
  if (
    parsed.data.fromTimestamp &&
    parsed.data.toTimestamp &&
    parsed.data.fromTimestamp > parsed.data.toTimestamp
  ) {
    return err(new FilterValidationError("fromTimestamp must not be after toTimestamp"));
  }
  return ok(parsed.data);
}

export function buildPredicate(filter: ExportFilter): (event: AuditEvent) => boolean {
  return (event: AuditEvent): boolean => {
    if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) return false;
    if (filter.toTimestamp && event.timestamp > filter.toTimestamp) return false;
    if (filter.categories && !filter.categories.includes(event.category)) return false;
    if (filter.severities && !filter.severities.includes(event.severity)) return false;
    if (filter.actorIds && !filter.actorIds.includes(event.actor.id)) return false;
    if (filter.resourceTypes && !filter.resourceTypes.includes(event.resource.type)) return false;
    if (filter.outcomes && !filter.outcomes.includes(event.outcome)) return false;
    if (filter.orgId && event.resource.orgId !== filter.orgId) return false;
    return true;
  };
}

export function applyFilter(events: readonly AuditEvent[], filter: ExportFilter): AuditEvent[] {
  const predicate = buildPredicate(filter);
  return events.filter(predicate);
}

export function composeFilters(
  ...filters: ReadonlyArray<(event: AuditEvent) => boolean>
): (event: AuditEvent) => boolean {
  return (event: AuditEvent): boolean => filters.every((f) => f(event));
}
