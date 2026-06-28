// Domain-specific error constructors for the incident module.
import { AppError } from "@veritas/core";

export class IncidentNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Incident not found: ${id}`);
  }
}

export class PostmortemNotFoundError extends AppError {
  constructor(incidentId: string) {
    super("NOT_FOUND", 404, `Postmortem not found for incident: ${incidentId}`);
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super("VALIDATION", 422, `Invalid incident status transition: ${from} → ${to}`);
  }
}

export class IncidentAlreadyClosedError extends AppError {
  constructor(id: string) {
    super("CONFLICT", 409, `Incident ${id} is already closed and cannot be modified`);
  }
}

export class ResponderNotFoundError extends AppError {
  constructor(responderId: string) {
    super("NOT_FOUND", 404, `Responder not found: ${responderId}`);
  }
}

export class DuplicatePostmortemError extends AppError {
  constructor(incidentId: string) {
    super("CONFLICT", 409, `Postmortem already exists for incident: ${incidentId}`);
  }
}

export class TimelineEntryNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Timeline entry not found: ${id}`);
  }
}
