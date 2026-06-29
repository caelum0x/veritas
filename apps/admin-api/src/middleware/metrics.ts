// Metrics middleware: increments request counters and records response latency.
import type { Request, Response, NextFunction } from "express";
import { MetricsRegistry } from "@veritas/observability";

const registry = new MetricsRegistry();

const requestCounter = registry.counter(
  "admin_api_requests_total",
  "Total HTTP requests received",
);

const latencyHistogram = registry.histogram(
  "admin_api_request_duration_ms",
  "HTTP request duration in milliseconds",
  [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
);

/** Middleware that records per-route request counts and latency. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const method = req.method;
    const path = (req.route?.path as string | undefined) ?? req.path;
    const status = String(res.statusCode);
    requestCounter.inc({ method, path, status });
    latencyHistogram.observe(durationMs, { method, path });
  });

  next();
}

/** Expose the shared MetricsRegistry for use in health checks or /metrics endpoint. */
export { registry as metricsRegistry };
