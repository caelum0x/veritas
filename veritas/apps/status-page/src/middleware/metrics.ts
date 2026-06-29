// Tracks HTTP request counts and latency via @veritas/observability MetricsRegistry.
import type { Request, Response, NextFunction } from "express";
import type { MetricsRegistry, Counter, Histogram } from "@veritas/observability";

const DEFAULT_HISTOGRAM_BUCKETS: readonly number[] = [
  1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
];

export interface HttpMetrics {
  readonly requestCounter: Counter;
  readonly latencyHistogram: Histogram;
}

export function createHttpMetrics(registry: MetricsRegistry): HttpMetrics {
  return {
    requestCounter: registry.counter(
      "http_requests_total",
      "Total number of HTTP requests",
    ),
    latencyHistogram: registry.histogram(
      "http_request_duration_ms",
      "HTTP request latency in milliseconds",
      [...DEFAULT_HISTOGRAM_BUCKETS],
    ),
  };
}

export function metricsMiddleware(httpMetrics: HttpMetrics) {
  return function trackMetrics(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const startMs = Date.now();

    res.once("finish", () => {
      const durationMs = Date.now() - startMs;
      const labels = {
        method: req.method,
        status: String(res.statusCode),
        path: req.route?.path ?? req.path,
      };

      httpMetrics.requestCounter.inc(labels);
      httpMetrics.latencyHistogram.observe(durationMs, labels);
    });

    next();
  };
}
