// Version-aware router: resolves the effective API version for each incoming request.
import { ok, err, type Result } from "@veritas/core";
import {
  LATEST_VERSION,
  type ApiVersion,
  type RouteVersionConfig,
  type VersionNegotiationResult,
} from "./types.js";
import {
  extractVersionFromHeader,
  extractVersionFromPath,
} from "./header.js";
import {
  UnsupportedVersionError,
  VersionNegotiationError,
} from "./errors.js";

export interface RouterOptions {
  readonly defaultVersion?: ApiVersion;
  readonly strictVersioning?: boolean;
}

export interface VersionRouter {
  readonly registerRoute: (config: RouteVersionConfig) => void;
  readonly resolveVersion: (
    path: string,
    method: string,
    headers: Readonly<Record<string, string | string[] | undefined>>
  ) => Result<VersionNegotiationResult, UnsupportedVersionError | VersionNegotiationError>;
  readonly getSupportedVersions: (path: string, method: string) => readonly ApiVersion[] | undefined;
}

export function createVersionRouter(options: RouterOptions = {}): VersionRouter {
  const routes = new Map<string, RouteVersionConfig>();
  const defaultVersion: ApiVersion = options.defaultVersion ?? LATEST_VERSION;

  function routeKey(path: string, method: string): string {
    return `${method.toUpperCase()}:${path}`;
  }

  function registerRoute(config: RouteVersionConfig): void {
    routes.set(routeKey(config.path, config.method), config);
  }

  function getSupportedVersions(
    path: string,
    method: string
  ): readonly ApiVersion[] | undefined {
    return routes.get(routeKey(path, method))?.supportedVersions;
  }

  function resolveVersion(
    path: string,
    method: string,
    headers: Readonly<Record<string, string | string[] | undefined>>
  ): Result<VersionNegotiationResult, UnsupportedVersionError | VersionNegotiationError> {
    const route = routes.get(routeKey(path, method));
    const supported: readonly ApiVersion[] = route?.supportedVersions ?? ["v1", "v2", "v3"];
    const routeDefault: ApiVersion = route?.defaultVersion ?? defaultVersion;

    // Prefer path-embedded version, then header
    const pathVersion = extractVersionFromPath(path);

    if (pathVersion !== undefined) {
      if (!supported.includes(pathVersion)) {
        if (options.strictVersioning === true) {
          return err(new UnsupportedVersionError(pathVersion, supported));
        }
        // fallback to route default
        return ok({ resolved: routeDefault, requested: pathVersion, wasNegotiated: true });
      }
      return ok({ resolved: pathVersion, requested: pathVersion, wasNegotiated: false });
    }

    const headerResult = extractVersionFromHeader(headers);
    if (!headerResult.ok) {
      const raw = (headers["x-api-version"] ?? headers["X-API-Version"]) as string | undefined;
      if (options.strictVersioning === true) {
        return err(new UnsupportedVersionError(raw ?? "unknown", supported));
      }
      return ok({ resolved: routeDefault, requested: raw, wasNegotiated: true });
    }

    const requested: ApiVersion = headerResult.value;

    // If the header explicitly stated LATEST_VERSION was used as fallback (empty header),
    // treat as no preference
    const rawHeader = headers["x-api-version"] ?? headers["X-API-Version"];
    const hadExplicitHeader = rawHeader !== undefined && rawHeader !== "";

    if (!supported.includes(requested)) {
      if (options.strictVersioning === true) {
        return err(new UnsupportedVersionError(requested, supported));
      }
      return ok({ resolved: routeDefault, requested: hadExplicitHeader ? requested : undefined, wasNegotiated: true });
    }

    return ok({
      resolved: requested,
      requested: hadExplicitHeader ? requested : undefined,
      wasNegotiated: !hadExplicitHeader,
    });
  }

  return { registerRoute, resolveVersion, getSupportedVersions };
}

export const defaultVersionRouter: VersionRouter = createVersionRouter();
