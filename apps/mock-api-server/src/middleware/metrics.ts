// Records HTTP request duration and count metrics via @veritas/observability MetricsRegistry.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { MetricsRegistry } from "@veritas/observability";

export function metricsMiddleware(metrics: MetricsRegistry): RequestHandler {
  const requestsTotal = metrics.counter(
    "http_requests_total",
    "Total number of HTTP requests",
  );
  const requestDuration = metrics.histogram(
    "http_request_duration_ms",
    "HTTP request duration in milliseconds",
  );

  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const labels = { method: req.method, status: String(res.statusCode) };
      requestsTotal.inc(labels);
      requestDuration.observe(durationMs, labels);
    });

    next();
  };
}
