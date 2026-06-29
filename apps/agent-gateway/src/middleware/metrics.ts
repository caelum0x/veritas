// Express middleware that records per-route HTTP metrics via the observability registry.

import type { Request, Response, NextFunction } from "express";
import { MetricsRegistry } from "@veritas/observability";

/** Build HTTP metrics middleware bound to the given registry. */
export function metricsMiddleware(registry: MetricsRegistry) {
  const requestsTotal = registry.counter(
    "http_requests_total",
    "Total number of HTTP requests"
  );
  const requestDuration = registry.histogram(
    "http_request_duration_ms",
    "HTTP request duration in milliseconds"
  );
  const activeRequests = registry.gauge(
    "http_active_requests",
    "Number of in-flight HTTP requests"
  );

  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    activeRequests.inc();

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const labels = {
        method: req.method,
        status: String(res.statusCode),
        route: req.route?.path ?? req.path,
      };

      requestsTotal.inc(labels);
      requestDuration.observe(durationMs, labels);
      activeRequests.dec();
    });

    next();
  };
}
