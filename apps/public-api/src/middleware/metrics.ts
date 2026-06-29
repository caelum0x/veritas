// metrics.ts: lightweight request metrics middleware using @veritas/observability registry.
import type { Request, Response, NextFunction } from "express";
import { globalRegistry } from "@veritas/observability";

const requestCounter = globalRegistry.counter(
  "http_requests_total",
  "Total number of HTTP requests received",
);

const requestDuration = globalRegistry.histogram(
  "http_request_duration_ms",
  "HTTP request duration in milliseconds",
  [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
);

/** Express middleware that records request count and duration metrics. */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startMs = Date.now();

  res.on("finish", () => {
    const labels = { method: req.method, status: String(res.statusCode) };
    requestCounter.inc(labels);
    requestDuration.observe(Date.now() - startMs, labels);
  });

  next();
}
