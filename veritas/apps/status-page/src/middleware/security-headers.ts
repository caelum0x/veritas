// Sets security-related HTTP response headers on every response.
import type { Request, Response, NextFunction } from "express";

export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'",
  );
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  res.removeHeader("X-Powered-By");
  next();
}
