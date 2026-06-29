// Applies security-relevant HTTP response headers (CORS, CSP, HSTS, etc.).
import type { Request, Response, NextFunction, RequestHandler } from "express";

export function securityHeadersMiddleware(corsOrigins: readonly string[]): RequestHandler {
  const allowAll = corsOrigins.includes("*");

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers["origin"];
    if (allowAll) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (typeof origin === "string" && corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,X-Request-ID,X-Correlation-ID",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
