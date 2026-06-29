// Metrics middleware — records HTTP request counts and latency via MetricsRegistry.
import type { Request, Response, NextFunction } from "express";
import type { MetricsRegistry } from "@veritas/observability";

/** Express middleware that records per-route request counts and response latencies. */
export function metricsMiddleware(registry: MetricsRegistry) {
  const requestCounter = registry.counter(
    "http_requests_total",
    "Total number of HTTP requests",
  );
  const latencyHistogram = registry.histogram(
    "http_request_duration_ms",
    "HTTP request duration in milliseconds",
  );
  const activeGauge = registry.gauge(
    "http_requests_active",
    "Number of in-flight HTTP requests",
  );

  return function recordMetrics(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    activeGauge.inc();

    res.on("finish", () => {
      activeGauge.dec();
      const durationMs = Date.now() - start;
      const labels = { method: req.method, status: String(res.statusCode) };
      requestCounter.inc(labels);
      latencyHistogram.observe(durationMs, labels);
    });

    next();
  };
}
