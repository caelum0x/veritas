// Request metrics middleware: counts and times every HTTP request.
import type { Request, Response, NextFunction } from "express";
import type { MetricsRegistry } from "@veritas/observability";

export function metricsMiddleware(registry: MetricsRegistry) {
  const requestCounter = registry.counter(
    "http_requests_total",
    "Total number of HTTP requests",
  );
  const durationHistogram = registry.histogram(
    "http_request_duration_ms",
    "HTTP request duration in milliseconds",
  );

  return (req: Request, res: Response, next: NextFunction): void => {
    const startMs = Date.now();

    res.on("finish", () => {
      const labels = {
        method: req.method,
        route: req.route?.path ?? req.path,
        status: String(res.statusCode),
      };
      requestCounter.inc(labels);
      durationHistogram.observe(Date.now() - startMs, labels);
    });

    next();
  };
}
