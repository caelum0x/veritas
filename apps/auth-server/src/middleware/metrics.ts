// metrics middleware: records HTTP request counters and latency histograms.

import type { Request, Response, NextFunction } from "express";
import type { MetricsRegistry } from "@veritas/observability";

/** Returns an Express middleware that tracks request counts and durations. */
export function metricsMiddleware(registry: MetricsRegistry) {
  const requestsTotal = registry.counter(
    "http_requests_total",
    "Total number of HTTP requests processed",
  );
  const requestDuration = registry.histogram(
    "http_request_duration_ms",
    "HTTP request latency in milliseconds",
  );

  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on("finish", () => {
      const labels = {
        method: req.method,
        route: (req.route?.path as string | undefined) ?? req.path,
        status: String(res.statusCode),
      };
      requestsTotal.inc(labels);
      requestDuration.observe(Date.now() - start, labels);
    });

    next();
  };
}
