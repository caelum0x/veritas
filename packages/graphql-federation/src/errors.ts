// Federation error types and factory helpers for subgraph composition and gateway failures.
import { AppError } from "@veritas/core";

export class SubgraphCompositionError extends AppError {
  readonly subgraphName: string;
  constructor(message: string, subgraphName: string, options?: { cause?: unknown }) {
    super("INTERNAL", 500, message, { cause: options?.cause });
    this.subgraphName = subgraphName;
    this.name = "SubgraphCompositionError";
  }
}

export class SupergraphBuildError extends AppError {
  readonly conflicts: ReadonlyArray<string>;
  constructor(message: string, conflicts: ReadonlyArray<string> = []) {
    super("INTERNAL", 500, message);
    this.conflicts = conflicts;
    this.name = "SupergraphBuildError";
  }
}

export class EntityResolutionError extends AppError {
  readonly typename: string;
  readonly subgraphName: string;
  constructor(typename: string, subgraphName: string, cause?: unknown) {
    super("INTERNAL", 500, `Failed to resolve entity ${typename} in subgraph ${subgraphName}`, {
      cause,
    });
    this.typename = typename;
    this.subgraphName = subgraphName;
    this.name = "EntityResolutionError";
  }
}

export class QueryPlanError extends AppError {
  readonly planId: string;
  constructor(message: string, planId: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.planId = planId;
    this.name = "QueryPlanError";
  }
}

export class GatewayConfigError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("INTERNAL", 500, message, { cause });
    this.name = "GatewayConfigError";
  }
}

export class SchemaStitchError extends AppError {
  readonly typeNames: ReadonlyArray<string>;
  constructor(message: string, typeNames: ReadonlyArray<string> = []) {
    super("INTERNAL", 500, message);
    this.typeNames = typeNames;
    this.name = "SchemaStitchError";
  }
}

export function isSubgraphCompositionError(e: unknown): e is SubgraphCompositionError {
  return e instanceof SubgraphCompositionError;
}

export function isSupergrpahBuildError(e: unknown): e is SupergraphBuildError {
  return e instanceof SupergraphBuildError;
}

export function isEntityResolutionError(e: unknown): e is EntityResolutionError {
  return e instanceof EntityResolutionError;
}

export function isQueryPlanError(e: unknown): e is QueryPlanError {
  return e instanceof QueryPlanError;
}

export function isGatewayConfigError(e: unknown): e is GatewayConfigError {
  return e instanceof GatewayConfigError;
}

export function isSchemaStitchError(e: unknown): e is SchemaStitchError {
  return e instanceof SchemaStitchError;
}
