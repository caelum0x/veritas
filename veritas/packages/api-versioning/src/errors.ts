// API versioning error types extending AppError for version-specific failures.
import { AppError, type AppErrorOptions } from "@veritas/core";
import type { ApiVersion } from "./types.js";

export class UnsupportedVersionError extends AppError {
  readonly requestedVersion: string;
  readonly supportedVersions: readonly ApiVersion[];

  constructor(
    requestedVersion: string,
    supportedVersions: readonly ApiVersion[],
    options?: AppErrorOptions
  ) {
    super(
      "VALIDATION",
      400,
      `API version '${requestedVersion}' is not supported. Supported versions: ${supportedVersions.join(", ")}`,
      options
    );
    this.requestedVersion = requestedVersion;
    this.supportedVersions = supportedVersions;
  }
}

export class DeprecatedVersionError extends AppError {
  readonly version: ApiVersion;
  readonly sunsetAt: string;
  readonly replacedBy: ApiVersion;

  constructor(
    version: ApiVersion,
    sunsetAt: string,
    replacedBy: ApiVersion,
    options?: AppErrorOptions
  ) {
    super(
      "UNAVAILABLE",
      410,
      `API version '${version}' is deprecated and will be removed on ${sunsetAt}. Please migrate to ${replacedBy}.`,
      options
    );
    this.version = version;
    this.sunsetAt = sunsetAt;
    this.replacedBy = replacedBy;
  }
}

export class MigrationError extends AppError {
  readonly fromVersion: ApiVersion;
  readonly toVersion: ApiVersion;

  constructor(
    fromVersion: ApiVersion,
    toVersion: ApiVersion,
    cause?: unknown,
    options?: AppErrorOptions
  ) {
    super(
      "INTERNAL",
      500,
      `Failed to migrate request/response from ${fromVersion} to ${toVersion}`,
      { ...options, cause }
    );
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
  }
}

export class VersionNegotiationError extends AppError {
  readonly requestedVersion: string;

  constructor(requestedVersion: string, options?: AppErrorOptions) {
    super(
      "VALIDATION",
      406,
      `Cannot negotiate a compatible API version for requested version '${requestedVersion}'`,
      options
    );
    this.requestedVersion = requestedVersion;
  }
}
