// Request and response migration pipeline between API versions.
import { ok, err, type Result } from "@veritas/core";
import type { ApiVersion, MigrationStep, VersionedRequest, VersionedResponse } from "./types.js";
import { MigrationError } from "./errors.js";

export interface MigrationRegistry {
  readonly register: (step: MigrationStep) => void;
  readonly migrateRequest: (
    req: VersionedRequest,
    targetVersion: ApiVersion
  ) => Result<VersionedRequest, MigrationError>;
  readonly migrateResponse: (
    res: VersionedResponse,
    targetVersion: ApiVersion
  ) => Result<VersionedResponse, MigrationError>;
}

const VERSION_ORDER: readonly ApiVersion[] = ["v1", "v2", "v3"];

function versionIndex(v: ApiVersion): number {
  return VERSION_ORDER.indexOf(v);
}

function buildMigrationPath(
  from: ApiVersion,
  to: ApiVersion,
  steps: readonly MigrationStep[]
): readonly MigrationStep[] | undefined {
  const fromIdx = versionIndex(from);
  const toIdx = versionIndex(to);
  if (fromIdx === toIdx) return [];

  const direction = fromIdx < toIdx ? 1 : -1;
  const path: MigrationStep[] = [];

  for (let i = fromIdx; i !== toIdx; i += direction) {
    const stepFrom = VERSION_ORDER[i] as ApiVersion;
    const stepTo = VERSION_ORDER[i + direction] as ApiVersion;
    const step = steps.find((s) => s.from === stepFrom && s.to === stepTo);
    if (!step) return undefined;
    path.push(step);
  }

  return path;
}

export function createMigrationRegistry(): MigrationRegistry {
  const steps: MigrationStep[] = [];

  function register(step: MigrationStep): void {
    steps.push(step);
  }

  function migrateRequest(
    req: VersionedRequest,
    targetVersion: ApiVersion
  ): Result<VersionedRequest, MigrationError> {
    if (req.version === targetVersion) return ok(req);

    const path = buildMigrationPath(req.version, targetVersion, steps);
    if (path === undefined) {
      return err(new MigrationError(req.version, targetVersion, undefined));
    }

    try {
      let body: unknown = req.body;
      for (const step of path) {
        body = step.migrateRequest(body);
      }
      return ok({ ...req, version: targetVersion, body });
    } catch (cause) {
      return err(new MigrationError(req.version, targetVersion, cause));
    }
  }

  function migrateResponse(
    res: VersionedResponse,
    targetVersion: ApiVersion
  ): Result<VersionedResponse, MigrationError> {
    if (res.version === targetVersion) return ok(res);

    const path = buildMigrationPath(res.version, targetVersion, steps);
    if (path === undefined) {
      return err(new MigrationError(res.version, targetVersion, undefined));
    }

    try {
      let body: unknown = res.body;
      for (const step of [...path].reverse()) {
        body = step.migrateResponse(body);
      }
      return ok({ ...res, version: targetVersion, body });
    } catch (cause) {
      return err(new MigrationError(res.version, targetVersion, cause));
    }
  }

  return { register, migrateRequest, migrateResponse };
}

export const defaultMigrationRegistry: MigrationRegistry =
  createMigrationRegistry();

// Register built-in v1 → v2 migration (adds metadata wrapper)
defaultMigrationRegistry.register({
  from: "v1",
  to: "v2",
  migrateRequest(body: unknown): unknown {
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      const { meta: _meta, ...rest } = body as Record<string, unknown>;
      return rest;
    }
    return body;
  },
  migrateResponse(body: unknown): unknown {
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      return { ...(body as Record<string, unknown>), _version: "v2" };
    }
    return body;
  },
});

// Register built-in v2 → v3 migration (adds provenance field)
defaultMigrationRegistry.register({
  from: "v2",
  to: "v3",
  migrateRequest(body: unknown): unknown {
    return body;
  },
  migrateResponse(body: unknown): unknown {
    if (body !== null && typeof body === "object" && !Array.isArray(body)) {
      const b = body as Record<string, unknown>;
      return {
        ...b,
        _version: "v3",
        provenance: b["provenance"] ?? null,
      };
    }
    return body;
  },
});
