// Dispute-domain error types extending the core AppError hierarchy.

import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from "@veritas/core";

/** Raised when a dispute entity cannot be located by its ID. */
export class DisputeNotFoundError extends NotFoundError {
  constructor(id: string) {
    super({ message: `Dispute not found: ${id}`, details: { entity: "Dispute", id } });
  }
}

/** Raised when an operation conflicts with the current dispute state. */
export class DisputeStateConflictError extends ConflictError {
  constructor(id: string, currentStatus: string, requiredStatus: string) {
    super({
      message: `Dispute ${id} is in status '${currentStatus}', expected '${requiredStatus}'`,
      details: { entity: "Dispute", id, currentStatus, requiredStatus },
    });
  }
}

/** Raised when a transition between dispute statuses is invalid. */
export class InvalidDisputeTransitionError extends ConflictError {
  constructor(from: string, to: string) {
    super({
      message: `Invalid dispute status transition: ${from} → ${to}`,
      details: { entity: "Dispute", from, to },
    });
  }
}

/** Raised when the caller lacks permission to act on a dispute. */
export class DisputeAccessDeniedError extends ForbiddenError {
  constructor(disputeId: string, userId: string, action: string) {
    super({
      message: `User ${userId} is not authorised to perform '${action}' on dispute ${disputeId}`,
      details: { disputeId, userId, action },
    });
  }
}

/** Raised when submitted dispute evidence fails validation. */
export class DisputeEvidenceValidationError extends ValidationError {
  constructor(reason: string) {
    super({ message: `Dispute evidence validation failed: ${reason}`, issues: [] });
  }
}
