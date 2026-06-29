// Incidents feature service — wraps IncidentService from @veritas/incident with logging.
import { isErr } from "@veritas/core";
import type {
  UpdateIncident,
  TimelineEntry,
  CreateTimelineEntry,
  IncidentListFilter,
} from "@veritas/incident";
import { IncidentService } from "@veritas/incident";
import type { Logger } from "@veritas/observability";

export interface IncidentsDeps {
  readonly incidentService: IncidentService;
  readonly logger: Logger;
}

/** Create a new incident via @veritas/incident IncidentService. */
export async function createIncident(
  deps: IncidentsDeps,
  data: Parameters<IncidentService["createIncident"]>[0],
) {
  const result = await deps.incidentService.createIncident(data);
  if (isErr(result)) {
    deps.logger.error("Failed to create incident", { error: String(result.error) });
  } else {
    deps.logger.info("Incident created", { incidentId: result.value.id, severity: result.value.severity });
  }
  return result;
}

/** Get a single incident by id. */
export async function getIncident(
  deps: IncidentsDeps,
  id: string,
) {
  const result = await deps.incidentService.getIncident(id);
  if (isErr(result)) {
    deps.logger.warn("Incident not found", { incidentId: id });
  }
  return result;
}

/** Update mutable fields of an incident. */
export async function updateIncident(
  deps: IncidentsDeps,
  id: string,
  patch: UpdateIncident,
) {
  const result = await deps.incidentService.updateIncident(id, patch);
  if (isErr(result)) {
    deps.logger.error("Failed to update incident", { incidentId: id, error: String(result.error) });
  }
  return result;
}

/** Transition an incident through its state machine. */
export async function transitionStatus(
  deps: IncidentsDeps,
  id: string,
  nextStatus: Parameters<IncidentService["transitionStatus"]>[1],
  actorId: string,
) {
  const result = await deps.incidentService.transitionStatus(id, nextStatus, actorId);
  if (isErr(result)) {
    deps.logger.error("Invalid status transition", {
      incidentId: id,
      nextStatus,
      error: String(result.error),
    });
  } else {
    deps.logger.info("Incident status transitioned", {
      incidentId: id,
      status: result.value.status,
    });
  }
  return result;
}

/** Assign a responder to an incident. */
export async function assignResponder(
  deps: IncidentsDeps,
  id: string,
  responderId: string,
  actorId: string,
) {
  return deps.incidentService.assignResponder(id, responderId, actorId);
}

/** Remove a responder from an incident. */
export async function removeResponder(
  deps: IncidentsDeps,
  id: string,
  responderId: string,
  actorId: string,
) {
  return deps.incidentService.removeResponder(id, responderId, actorId);
}

/** List incidents with filtering and pagination. */
export async function listIncidents(
  deps: IncidentsDeps,
  filter: IncidentListFilter,
) {
  return deps.incidentService.listIncidents(filter);
}

/** Add a timeline entry to an incident. */
export async function addTimelineEntry(
  deps: IncidentsDeps,
  data: CreateTimelineEntry,
) {
  return deps.incidentService.addTimelineEntry(data);
}

/** Get the full timeline for an incident. */
export async function getTimeline(
  deps: IncidentsDeps,
  incidentId: string,
) {
  return deps.incidentService.getTimeline(incidentId);
}

/** Create a postmortem for an incident. */
export async function createPostmortem(
  deps: IncidentsDeps,
  data: Parameters<IncidentService["createPostmortem"]>[0],
) {
  return deps.incidentService.createPostmortem(data);
}

/** Get the postmortem for an incident. */
export async function getPostmortem(
  deps: IncidentsDeps,
  incidentId: string,
) {
  return deps.incidentService.getPostmortem(incidentId);
}

/** Update the postmortem for an incident. */
export async function updatePostmortem(
  deps: IncidentsDeps,
  incidentId: string,
  patch: Parameters<IncidentService["updatePostmortem"]>[1],
) {
  return deps.incidentService.updatePostmortem(incidentId, patch);
}

/** Get aggregated metrics for a set of incidents. */
export async function getMetrics(
  deps: IncidentsDeps,
  filter: Parameters<IncidentService["getMetrics"]>[0],
) {
  return deps.incidentService.getMetrics(filter);
}

/** Get SLO compliance metrics for incidents. */
export async function getSloMetrics(
  deps: IncidentsDeps,
  filter: Parameters<IncidentService["getSloMetrics"]>[0],
  targetMttrMs: number,
) {
  return deps.incidentService.getSloMetrics(filter, targetMttrMs);
}
