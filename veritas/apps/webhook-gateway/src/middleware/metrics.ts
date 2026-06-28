// Prometheus-style metrics middleware using @veritas/observability MetricsRegistry.

import type { Request, Response, NextFunction } from "express";
import type { MetricsRegistry } from "@veritas/observability";

export function metricsMiddleware(registry: MetricsRegistry) {
  const requestsTotal = registry.counter(
    "http_requests_total",
    "Total number of HTTP requests",
  );
  const requestDuration = registry.histogram(
    "http_request_duration_ms",
    "HTTP request duration in milliseconds",
  );
  const activeRequests = registry.gauge(
    "http_active_requests",
    "Number of in-flight HTTP requests",
  );

  return function metrics(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    activeRequests.inc();

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const labels = { method: req.method, status: String(res.statusCode) };
      requestsTotal.inc(labels);
      requestDuration.observe(durationMs, labels);
      activeRequests.dec();
    });

    next();
  };
}
