// Domain errors for the multi-region module — typed, structured error classes.

import { AppError, type AppErrorOptions } from "@veritas/core";
import type { RegionId } from "./region.js";

export class RegionNotFoundError extends AppError {
  constructor(regionId: RegionId, options: AppErrorOptions = {}) {
    super("NOT_FOUND", 404, `Region not found: ${regionId}`, options);
  }
}

export class RegionUnavailableError extends AppError {
  constructor(regionId: RegionId, reason?: string, options: AppErrorOptions = {}) {
    super(
      "UNAVAILABLE",
      503,
      reason ? `Region ${regionId} unavailable: ${reason}` : `Region ${regionId} unavailable`,
      options
    );
  }
}

export class NoHealthyRegionError extends AppError {
  constructor(capability?: string, options: AppErrorOptions = {}) {
    super(
      "UNAVAILABLE",
      503,
      capability
        ? `No healthy region available with capability: ${capability}`
        : "No healthy region available",
      options
    );
  }
}

export class FailoverExhaustedError extends AppError {
  constructor(attempted: readonly RegionId[], options: AppErrorOptions = {}) {
    super(
      "UNAVAILABLE",
      503,
      `Failover exhausted after trying regions: ${attempted.join(", ")}`,
      options
    );
  }
}

export class ResidencyViolationError extends AppError {
  constructor(dataType: string, requestedRegion: RegionId, options: AppErrorOptions = {}) {
    super(
      "FORBIDDEN",
      403,
      `Data residency violation: ${dataType} cannot be stored in region ${requestedRegion}`,
      options
    );
  }
}

export class ReplicationConflictError extends AppError {
  constructor(resourceId: string, options: AppErrorOptions = {}) {
    super(
      "CONFLICT",
      409,
      `Replication conflict detected for resource: ${resourceId}`,
      options
    );
  }
}

export class LatencyThresholdError extends AppError {
  constructor(
    regionId: RegionId,
    latencyMs: number,
    thresholdMs: number,
    options: AppErrorOptions = {}
  ) {
    super(
      "UNAVAILABLE",
      503,
      `Region ${regionId} latency ${latencyMs}ms exceeds threshold ${thresholdMs}ms`,
      options
    );
  }
}

export type MultiRegionError =
  | RegionNotFoundError
  | RegionUnavailableError
  | NoHealthyRegionError
  | FailoverExhaustedError
  | ResidencyViolationError
  | ReplicationConflictError
  | LatencyThresholdError;
