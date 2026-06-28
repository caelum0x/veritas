// Negotiates the effective API version from request headers or query params.

import { Result, ok, err } from "@veritas/core";
import {
  ApiVersion,
  apiVersion,
  LATEST_VERSION,
  isSupported,
  SUPPORTED_VERSIONS,
  versionString,
} from "./version.js";

export interface NegotiationSource {
  readonly header?: string | undefined;
  readonly query?: string | undefined;
}

export interface NegotiationResult {
  readonly version: ApiVersion;
  readonly source: "header" | "query" | "default";
}

export interface NegotiatorConfig {
  readonly headerName: string;
  readonly queryParam: string;
  readonly defaultVersion: ApiVersion;
}

export const DEFAULT_NEGOTIATOR_CONFIG: NegotiatorConfig = {
  headerName: "Veritas-Version",
  queryParam: "api_version",
  defaultVersion: LATEST_VERSION,
};

export function negotiate(
  input: NegotiationSource,
  config: NegotiatorConfig = DEFAULT_NEGOTIATOR_CONFIG
): Result<NegotiationResult, string> {
  const rawHeader = input.header?.trim();
  const rawQuery = input.query?.trim();

  if (rawHeader) {
    return parseAndValidate(rawHeader, "header");
  }

  if (rawQuery) {
    return parseAndValidate(rawQuery, "query");
  }

  return ok({ version: config.defaultVersion, source: "default" });
}

function parseAndValidate(
  raw: string,
  source: "header" | "query"
): Result<NegotiationResult, string> {
  let parsed: ApiVersion;
  try {
    parsed = apiVersion(raw);
  } catch {
    return err(
      `Invalid version format "${raw}". Expected YYYY-MM-DD. Supported: ${SUPPORTED_VERSIONS.map(versionString).join(", ")}.`
    );
  }

  if (!isSupported(parsed)) {
    return err(
      `Unsupported API version "${raw}". Supported: ${SUPPORTED_VERSIONS.map(versionString).join(", ")}.`
    );
  }

  return ok({ version: parsed, source });
}
