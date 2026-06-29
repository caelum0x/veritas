// Mounts a sub-app Router under a validated base path on an Express app.

import type { Express } from "express";
import type { Logger } from "@veritas/observability";
import type { MountableApp } from "./types.js";
import { InvalidBasePathError, DuplicatePathError } from "./errors.js";

/**
 * Validates that `basePath` begins with "/" and contains no trailing slash
 * (unless it is the root path itself).
 */
function validateBasePath(basePath: string): void {
  if (!basePath.startsWith("/")) {
    throw new InvalidBasePathError(basePath);
  }
  if (basePath.length > 1 && basePath.endsWith("/")) {
    throw new InvalidBasePathError(basePath);
  }
}

/**
 * Mounts a single {@link MountableApp} onto the provided Express application.
 * Validates the base path and warns on re-use of already-mounted paths.
 */
export function mountApp(
  expressApp: Express,
  mountable: MountableApp,
  mounted: ReadonlySet<string>,
  logger: Logger,
): ReadonlySet<string> {
  validateBasePath(mountable.basePath);

  if (mounted.has(mountable.basePath)) {
    throw new DuplicatePathError(mountable.basePath);
  }

  expressApp.use(mountable.basePath, mountable.router);

  logger.info("Mounted sub-app", {
    name: mountable.name,
    basePath: mountable.basePath,
  });

  return new Set([...mounted, mountable.basePath]);
}

/**
 * Mounts every app in `apps` onto `expressApp` in order, accumulating the set
 * of mounted paths and returning it.
 */
export function mountAll(
  expressApp: Express,
  apps: readonly MountableApp[],
  logger: Logger,
): ReadonlySet<string> {
  return apps.reduce<ReadonlySet<string>>(
    (mounted, app) => mountApp(expressApp, app, mounted, logger),
    new Set<string>(),
  );
}
