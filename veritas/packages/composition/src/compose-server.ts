// Composes an Express application by assembling middleware and mounting sub-apps.

import express from "express";
import type { ComposeServerOptions, ComposedServer } from "./types.js";
import { applyMiddlewareStack } from "./middleware-stack.js";
import { mountAll } from "./mount.js";

/**
 * Builds a fully configured Express application from a set of {@link MountableApp}
 * instances. Applies the shared middleware stack first, then mounts each app
 * under its declared base path.
 *
 * Returns the composed Express app and the list of mounted paths for inspection.
 */
export function composeServer(options: ComposeServerOptions): ComposedServer {
  const {
    apps,
    middleware = [],
    logger,
    trustProxy = false,
    bodyLimitBytes = 1_048_576,
  } = options;

  const app = express();

  applyMiddlewareStack(app, {
    bodyLimitBytes,
    trustProxy,
    custom: [...middleware],
    logger,
  });

  const mountedSet = mountAll(app, apps, logger);

  // Generic 404 handler for unmatched routes
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: "Not found" });
  });

  // Global error handler
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction,
    ) => {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      logger.error("Unhandled error", { error: message });
      res.status(500).json({ success: false, error: message });
    },
  );

  logger.info("Server composed", { mountedPaths: [...mountedSet] });

  return {
    app,
    mountedPaths: [...mountedSet],
  };
}
