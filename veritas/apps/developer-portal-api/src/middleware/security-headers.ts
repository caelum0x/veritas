// Security headers middleware — sets HSTS, CSP, and other protective headers.
import type { Request, Response, NextFunction, RequestHandler } from "express";

export function securityHeadersMiddleware(): RequestHandler {
  return function setSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'",
    );
    res.removeHeader("X-Powered-By");
    next();
  };
}
