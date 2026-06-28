// Security-headers middleware — sets defensive HTTP headers on every response.
import type { Request, Response, NextFunction } from "express";

/** Sets HSTS, CSP, frame-options, and other security headers on every response. */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
}
