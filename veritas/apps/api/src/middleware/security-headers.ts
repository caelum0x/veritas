// Security-headers middleware: sets CSP, HSTS, X-Frame-Options, and other defensive headers.
import type { RequestHandler } from "express";

/** Returns a middleware that applies a standard set of security HTTP response headers. */
export function securityHeaders(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'",
    );
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
    res.removeHeader("X-Powered-By");
    next();
  };
}
