// Citation-graph domain errors extending AppError.

import { AppError } from "@veritas/core";

export class GraphNodeNotFoundError extends AppError {
  constructor(nodeId: string) {
    super("NOT_FOUND", 404, `Graph node not found: ${nodeId}`, { details: { nodeId } });
  }
}

export class GraphEdgeNotFoundError extends AppError {
  constructor(edgeId: string) {
    super("NOT_FOUND", 404, `Graph edge not found: ${edgeId}`, { details: { edgeId } });
  }
}

export class DuplicateNodeError extends AppError {
  constructor(nodeId: string) {
    super("CONFLICT", 409, `Node already exists in graph: ${nodeId}`, { details: { nodeId } });
  }
}

export class DuplicateEdgeError extends AppError {
  constructor(edgeId: string) {
    super("CONFLICT", 409, `Edge already exists in graph: ${edgeId}`, { details: { edgeId } });
  }
}

export class GraphCycleError extends AppError {
  constructor(path: readonly string[]) {
    super("VALIDATION", 422, `Cycle detected in citation graph`, { details: { path } });
  }
}

export class GraphQueryError extends AppError {
  constructor(message: string, detail?: Record<string, unknown>) {
    super("VALIDATION", 422, message, { details: detail });
  }
}
