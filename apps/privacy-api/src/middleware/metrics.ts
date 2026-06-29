// Middleware: records HTTP request counters and latency histograms via MetricsRegistry.

import type { Request, Response, NextFunction } from "express";
import type { MetricsRegistry } from "@veritas/observability";

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

  return (req: Request, res: Response, next: NextFunction): void => {
    const startMs = Date.now();
    activeGauge.inc();

    res.on("finish", () => {
      const durationMs = Date.now() - startMs;
      const labels = { method: req.method, status: String(res.statusCode) };
      requestCounter.inc(labels);
      latencyHistogram.observe(durationMs, labels);
      activeGauge.dec();
    });

    next();
  };
}
