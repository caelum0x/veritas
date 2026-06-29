// security-headers.ts: sets HTTP security headers on every response.
import type { Request, Response, NextFunction } from "express";

/** Apply a baseline set of HTTP security response headers. */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0"); // modern browsers use CSP instead
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'",
  );
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), camera=(), microphone=()",
  );
  res.setHeader("Cache-Control", "no-store");
  next();
}
