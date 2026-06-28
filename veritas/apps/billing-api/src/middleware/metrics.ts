// HTTP metrics middleware — records request count, duration, and status via MetricsRegistry.

import type { Request, Response, NextFunction } from "express";
import type { MetricsRegistry } from "@veritas/observability";

export function metricsMiddleware(registry: MetricsRegistry) {
  const requestCount = registry.counter(
    "http_requests_total",
    "Total number of HTTP requests",
  );
  const requestDuration = registry.histogram(
    "http_request_duration_ms",
    "HTTP request duration in milliseconds",
  );
  const activeRequests = registry.gauge(
    "http_active_requests",
    "Number of currently active HTTP requests",
  );

  return (req: Request, res: Response, next: NextFunction): void => {
    const startMs = Date.now();
    activeRequests.inc();

    res.on("finish", () => {
      const durationMs = Date.now() - startMs;
      const labels = {
        method: req.method,
        status: String(res.statusCode),
        path: req.route?.path ?? "unknown",
      };
      requestCount.inc(labels);
      requestDuration.observe(durationMs, labels);
      activeRequests.dec();
    });

    next();
  };
}
