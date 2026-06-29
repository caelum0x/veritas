// V1 API versioning helpers: version prefix constant and version-aware Router factory.
import { Router } from "express";

/** Current public API version string. */
export const API_VERSION = "v1" as const;

/** Canonical URL prefix for all v1 routes. */
export const V1_PREFIX = "/v1" as const;

/** API version response header name. */
export const VERSION_HEADER = "X-Veritas-Api-Version" as const;

/** Current semver of the public API, injected from package.json at build time. */
export const API_SEMVER = "1.0.0" as const;

/**
 * Create a sub-Router pre-configured with the v1 version response header.
 * All v1 route modules should use this factory instead of raw `Router()`.
 */
export function createV1Router(): Router {
  const router = Router();

  router.use((_req, res, next) => {
    res.setHeader(VERSION_HEADER, API_VERSION);
    next();
  });

  return router;
}

/** Returns true when the given path is under the v1 prefix. */
export function isV1Path(path: string): boolean {
  return path.startsWith(V1_PREFIX);
}
