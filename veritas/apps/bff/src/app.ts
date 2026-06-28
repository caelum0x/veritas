// Build and configure the BFF Express application with middleware and routes.
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { isAppError, apiFailure, type Logger, type ErrorCode } from "@veritas/core";
import { VeritasClient } from "@veritas/sdk/client.js";
import { buildBffRouter, type RouterDeps } from "./router.js";
import { VeritasUpstream } from "./upstream.js";
import { UpstreamApiError } from "./errors.js";

export interface BffAppConfig {
  readonly corsOrigins: string[];
  readonly sessionSecret: string;
  readonly upstream: {
    readonly baseUrl: string;
    readonly serviceToken: string;
    readonly timeoutMs: number;
  };
  readonly apiKey: string;
  readonly apiBaseUrl: string;
}

const STATUS_MAP: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

/** Build the BFF Express application. */
export function buildBffApp(config: BffAppConfig, logger: Logger): Express {
  const app = express();

  // Trust first proxy for accurate IPs when behind a load balancer.
  app.set("trust proxy", 1);

  // CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers["origin"];
    const allowed =
      config.corsOrigins.includes("*") ||
      (typeof origin === "string" && config.corsOrigins.includes(origin));
    if (allowed && typeof origin === "string") {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Request-Id");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "512kb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info("bff request", { method: req.method, path: req.path });
    next();
  });

  // Build upstream and SDK client
  const upstream = new VeritasUpstream(config.upstream);
  const client = new VeritasClient({ apiKey: config.apiKey, baseUrl: config.apiBaseUrl });

  const routerDeps: RouterDeps = { client, upstream, logger };
  app.use("/api/bff", buildBffRouter(routerDeps));

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json(apiFailure({ message: "Not Found", code: "NOT_FOUND" }));
  });

  // Global error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof UpstreamApiError) {
      logger.warn("bff upstream error", { status: err.statusCode, message: err.message });
      res
        .status(err.statusCode)
        .json(apiFailure({ message: err.message, code: err.code as ErrorCode }));
      return;
    }
    if (isAppError(err)) {
      const status = STATUS_MAP[err.code] ?? 500;
      if (status >= 500) {
        logger.error("bff app error", { error: err.message, code: err.code });
      } else {
        logger.warn("bff client error", { error: err.message, code: err.code });
      }
      res.status(status).json(apiFailure({ message: err.message, code: err.code }));
      return;
    }
    const msg = err instanceof Error ? err.message : "Internal server error";
    logger.error("bff unhandled error", { error: msg });
    res.status(500).json(apiFailure({ message: "Internal server error", code: "INTERNAL" }));
  });

  return app;
}
