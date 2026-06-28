// Middleware: records per-request HTTP metrics into the MetricsRegistry.
import type { Request, Response, NextFunction } from "express";
import type { MetricsRegistry } from "@veritas/observability";

export function makeMetricsMiddleware(registry: MetricsRegistry) {
  const requestCounter = registry.counter(
    "ops_api_http_requests_total",
    "Total HTTP requests handled",
  );
  const durationHistogram = registry.histogram(
    "ops_api_http_request_duration_ms",
    "HTTP request duration in milliseconds",
  );
  const activeGauge = registry.gauge(
    "ops_api_http_active_requests",
    "Currently active HTTP requests",
  );

  return function metricsMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const start = Date.now();
    const labels = { method: req.method };

    activeGauge.inc(labels);

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const fullLabels = { method: req.method, status: String(res.statusCode) };
      requestCounter.inc(fullLabels);
      durationHistogram.observe(durationMs, fullLabels);
      activeGauge.dec(labels);
    });

    next();
  };
}
