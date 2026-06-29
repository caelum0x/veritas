// HTTP metrics middleware — records request count, latency, and error rates.
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { MetricsRegistry } from "@veritas/observability";

export function metricsMiddleware(metrics: MetricsRegistry): RequestHandler {
  const requestCount = metrics.counter(
    "http_requests_total",
    "Total number of HTTP requests",
  );
  const requestDuration = metrics.histogram(
    "http_request_duration_ms",
    "HTTP request duration in milliseconds",
  );
  const activeRequests = metrics.gauge(
    "http_active_requests",
    "Number of in-flight HTTP requests",
  );

  return function recordMetrics(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const labels = { method: req.method, path: req.route?.path ?? req.path };

    activeRequests.inc(labels);

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const statusLabels = { ...labels, status: String(res.statusCode) };
      requestCount.inc(statusLabels);
      requestDuration.observe(durationMs, statusLabels);
      activeRequests.dec(labels);
    });

    next();
  };
}
