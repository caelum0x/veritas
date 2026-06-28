// errors.ts: domain-specific errors for the fact-graph module.
import { AppError, type AppErrorOptions } from "@veritas/core";

export class EntityNotFoundError extends AppError {
  constructor(entityId: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Entity not found: ${entityId}`, {
      details: { entityId },
      ...opts,
    });
    this.name = "EntityNotFoundError";
  }
}

export class RelationNotFoundError extends AppError {
  constructor(relationId: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Relation not found: ${relationId}`, {
      details: { relationId },
      ...opts,
    });
    this.name = "RelationNotFoundError";
  }
}

export class TripleNotFoundError extends AppError {
  constructor(tripleId: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Triple not found: ${tripleId}`, {
      details: { tripleId },
      ...opts,
    });
    this.name = "TripleNotFoundError";
  }
}

export class GraphNotFoundError extends AppError {
  constructor(graphId: string, opts?: Partial<AppErrorOptions>) {
    super("NOT_FOUND", 404, `Fact graph not found: ${graphId}`, {
      details: { graphId },
      ...opts,
    });
    this.name = "GraphNotFoundError";
  }
}

export class ExtractionError extends AppError {
  constructor(claimId: string, cause?: unknown, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Entity/relation extraction failed for claim: ${claimId}`, {
      details: { claimId },
      cause: cause instanceof Error ? cause : undefined,
      ...opts,
    });
    this.name = "ExtractionError";
  }
}

export class MergeConflictError extends AppError {
  constructor(entityIds: ReadonlyArray<string>, reason: string, opts?: Partial<AppErrorOptions>) {
    super("CONFLICT", 409, `Entity merge conflict: ${reason}`, {
      details: { entityIds: [...entityIds], reason },
      ...opts,
    });
    this.name = "MergeConflictError";
  }
}

export class LinkingError extends AppError {
  constructor(label: string, cause?: unknown, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Entity linking failed for label: ${label}`, {
      details: { label },
      cause: cause instanceof Error ? cause : undefined,
      ...opts,
    });
    this.name = "LinkingError";
  }
}

export class InferenceError extends AppError {
  constructor(ruleId: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Inference rule ${ruleId} failed: ${reason}`, {
      details: { ruleId, reason },
      ...opts,
    });
    this.name = "InferenceError";
  }
}

export class GraphCapacityError extends AppError {
  constructor(limit: number, kind: "entities" | "relations" | "triples", opts?: Partial<AppErrorOptions>) {
    super("VALIDATION", 422, `Graph ${kind} capacity exceeded: limit is ${limit}`, {
      details: { limit, kind },
      ...opts,
    });
    this.name = "GraphCapacityError";
  }
}

export class ExportError extends AppError {
  constructor(format: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Graph export to ${format} failed: ${reason}`, {
      details: { format, reason },
      ...opts,
    });
    this.name = "ExportError";
  }
}

export class CanonicalizationError extends AppError {
  constructor(label: string, reason: string, opts?: Partial<AppErrorOptions>) {
    super("INTERNAL", 500, `Entity canonicalization failed for "${label}": ${reason}`, {
      details: { label, reason },
      ...opts,
    });
    this.name = "CanonicalizationError";
  }
}
