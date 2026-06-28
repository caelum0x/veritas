// Version header extraction and injection for HTTP requests and responses.
import { ok, err, type Result } from "@veritas/core";
import { ApiVersionSchema, LATEST_VERSION, type ApiVersion } from "./types.js";
import { UnsupportedVersionError } from "./errors.js";

export const VERSION_HEADER = "X-API-Version";
export const VERSION_ACCEPT_HEADER = "X-API-Version-Accept";
export const VERSION_DEPRECATED_HEADER = "X-API-Deprecated";
export const VERSION_SUNSET_HEADER = "Sunset";
export const VERSION_LINK_HEADER = "Link";

export interface VersionHeaders {
  readonly [VERSION_HEADER]: string;
  readonly [VERSION_DEPRECATED_HEADER]?: string;
  readonly [VERSION_SUNSET_HEADER]?: string;
  readonly [VERSION_LINK_HEADER]?: string;
}

export function extractVersionFromHeader(
  headers: Readonly<Record<string, string | string[] | undefined>>
): Result<ApiVersion, UnsupportedVersionError> {
  const raw = headers[VERSION_HEADER.toLowerCase()] ?? headers[VERSION_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value === undefined || value === "") {
    return ok(LATEST_VERSION);
  }

  const parsed = ApiVersionSchema.safeParse(value.trim().toLowerCase());
  if (!parsed.success) {
    return err(
      new UnsupportedVersionError(value, ["v1", "v2", "v3"])
    );
  }

  return ok(parsed.data);
}

export function extractVersionFromPath(path: string): ApiVersion | undefined {
  const match = /\/?(v\d+)\//i.exec(path) ?? /\/?(v\d+)$/i.exec(path);
  if (!match) return undefined;
  const parsed = ApiVersionSchema.safeParse(match[1]?.toLowerCase());
  return parsed.success ? parsed.data : undefined;
}

export function buildVersionResponseHeaders(
  version: ApiVersion,
  options?: {
    readonly deprecated?: boolean;
    readonly sunsetAt?: string;
    readonly docsUrl?: string;
  }
): Record<string, string> {
  const headers: Record<string, string> = {
    [VERSION_HEADER]: version,
  };

  if (options?.deprecated === true) {
    headers[VERSION_DEPRECATED_HEADER] = "true";
  }

  if (options?.sunsetAt !== undefined) {
    headers[VERSION_SUNSET_HEADER] = options.sunsetAt;
  }

  if (options?.docsUrl !== undefined) {
    headers[VERSION_LINK_HEADER] = `<${options.docsUrl}>; rel="deprecation"`;
  }

  return headers;
}

export function parseAcceptVersionHeader(
  headers: Readonly<Record<string, string | string[] | undefined>>
): readonly ApiVersion[] {
  const raw =
    headers[VERSION_ACCEPT_HEADER.toLowerCase()] ??
    headers[VERSION_ACCEPT_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value === undefined || value === "") return [];

  return value
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .flatMap((v) => {
      const parsed = ApiVersionSchema.safeParse(v);
      return parsed.success ? [parsed.data] : [];
    });
}
