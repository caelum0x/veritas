// Core types for API versioning: version descriptors, negotiation context, migration steps.
import { z } from "zod";

export const ApiVersionSchema = z.enum(["v1", "v2", "v3"]);
export type ApiVersion = z.infer<typeof ApiVersionSchema>;

export const ALL_VERSIONS: readonly ApiVersion[] = ["v1", "v2", "v3"] as const;
export const LATEST_VERSION: ApiVersion = "v3";
export const MINIMUM_VERSION: ApiVersion = "v1";

export interface VersionedRequest {
  readonly version: ApiVersion;
  readonly path: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly query: Readonly<Record<string, string>>;
}

export interface VersionedResponse {
  readonly version: ApiVersion;
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export interface MigrationStep {
  readonly from: ApiVersion;
  readonly to: ApiVersion;
  readonly migrateRequest: (req: unknown) => unknown;
  readonly migrateResponse: (res: unknown) => unknown;
}

export interface DeprecationInfo {
  readonly version: ApiVersion;
  readonly deprecatedAt: string;
  readonly sunsetAt: string;
  readonly replacedBy: ApiVersion;
  readonly notice: string;
}

export interface CompatibilityEntry {
  readonly version: ApiVersion;
  readonly compatibleWith: readonly ApiVersion[];
  readonly breaking: boolean;
  readonly changes: readonly string[];
}

export interface RouteVersionConfig {
  readonly path: string;
  readonly method: string;
  readonly supportedVersions: readonly ApiVersion[];
  readonly defaultVersion: ApiVersion;
}

export interface VersionNegotiationResult {
  readonly resolved: ApiVersion;
  readonly requested: string | undefined;
  readonly wasNegotiated: boolean;
}
