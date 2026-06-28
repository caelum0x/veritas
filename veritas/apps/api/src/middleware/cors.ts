// CORS configuration middleware: configures cross-origin resource sharing for the API.
import type { Request, Response, NextFunction } from "express";

export interface CorsOptions {
  allowedOrigins: string[] | "*";
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
}

const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

const DEFAULT_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Api-Key",
  "Idempotency-Key",
  "X-Request-Id",
];

const DEFAULT_EXPOSED_HEADERS = [
  "X-Request-Id",
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset",
  "Retry-After",
  "Idempotency-Replay",
];

function isOriginAllowed(origin: string, allowed: string[] | "*"): boolean {
  if (allowed === "*") return true;
  return allowed.includes(origin);
}

export function createCorsMiddleware(options: CorsOptions) {
  const {
    allowedOrigins,
    allowedMethods = DEFAULT_ALLOWED_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
    exposedHeaders = DEFAULT_EXPOSED_HEADERS,
    allowCredentials = false,
    maxAge = 86400,
  } = options;

  return function corsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const origin = req.headers.origin;

    if (!origin) {
      next();
      return;
    }

    if (isOriginAllowed(origin, allowedOrigins)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      // Not allowed — skip CORS headers; browser will block
      if (req.method === "OPTIONS") {
        res.status(403).end();
        return;
      }
      next();
      return;
    }

    res.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
    res.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(", "));
    res.setHeader("Access-Control-Expose-Headers", exposedHeaders.join(", "));

    if (allowCredentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (allowedOrigins !== "*") {
      res.setHeader("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Max-Age", String(maxAge));
      res.status(204).end();
      return;
    }

    next();
  };
}

export function createPermissiveCorsMiddleware() {
  return createCorsMiddleware({
    allowedOrigins: "*",
    allowCredentials: false,
  });
}

export function createRestrictedCorsMiddleware(allowedOrigins: string[]) {
  return createCorsMiddleware({
    allowedOrigins,
    allowCredentials: true,
  });
}
