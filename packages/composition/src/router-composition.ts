// Utilities for merging and composing Express Routers into a single Router.

import { Router, type RequestHandler } from "express";

/** Options for merging multiple routers under optional path prefixes. */
export interface RouterMergeOptions {
  /** Prefix under which all merged routers are mounted. Defaults to "/". */
  readonly prefix?: string;
  /** Middleware applied before delegating to child routers. */
  readonly before?: readonly RequestHandler[];
  /** Middleware applied after child routers (e.g. 404 handler). */
  readonly after?: readonly RequestHandler[];
}

/**
 * Merges an array of routers into a single parent Router.
 * Each entry may optionally carry its own sub-path.
 */
export function mergeRouters(
  routers: readonly { path: string; router: Router }[],
  options: RouterMergeOptions = {},
): Router {
  const { prefix = "/", before = [], after = [] } = options;

  const parent = Router({ mergeParams: true });

  for (const mw of before) {
    parent.use(mw);
  }

  for (const { path, router } of routers) {
    parent.use(path, router);
  }

  for (const mw of after) {
    parent.use(mw);
  }

  const root = Router({ mergeParams: true });
  root.use(prefix, parent);
  return root;
}

/**
 * Creates a new Router and applies `middleware` before delegating to `child`.
 * Useful for wrapping an existing router with auth or rate-limit guards.
 */
export function wrapRouter(
  child: Router,
  middleware: readonly RequestHandler[],
): Router {
  const wrapper = Router({ mergeParams: true });
  for (const mw of middleware) {
    wrapper.use(mw);
  }
  wrapper.use(child);
  return wrapper;
}

/**
 * Composes an ordered list of flat routers (no sub-paths) into one router.
 * Useful for stacking feature-level routers within a single domain.
 */
export function composeRouters(routers: readonly Router[]): Router {
  const composed = Router({ mergeParams: true });
  for (const r of routers) {
    composed.use(r);
  }
  return composed;
}
