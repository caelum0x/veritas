// Domain errors for the lineage module.
import { AppError } from "@veritas/core";

export class LineageNodeNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Lineage node not found: ${id}`);
  }
}

export class LineageEdgeNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Lineage edge not found: ${id}`);
  }
}

export class LineageGraphNotFoundError extends AppError {
  constructor(id: string) {
    super("NOT_FOUND", 404, `Lineage graph not found: ${id}`);
  }
}

export class CyclicLineageError extends AppError {
  constructor(nodeId: string) {
    super("VALIDATION", 422, `Cyclic lineage detected at node: ${nodeId}`);
  }
}

export class LineageDepthExceededError extends AppError {
  constructor(maxDepth: number) {
    super("VALIDATION", 422, `Lineage traversal exceeded max depth: ${maxDepth}`);
  }
}

export class ColumnLineageNotFoundError extends AppError {
  constructor(nodeId: string, column: string) {
    super("NOT_FOUND", 404, `Column lineage not found for ${nodeId}.${column}`);
  }
}

export class InvalidLineageQueryError extends AppError {
  constructor(reason: string) {
    super("VALIDATION", 400, `Invalid lineage query: ${reason}`);
  }
}
