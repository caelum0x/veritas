// Configuration for the metrics-exporter HTTP server and scrape behaviour.

import { z } from "zod";

const ConfigSchema = z.object({
  /** TCP port the HTTP server listens on. */
  port: z.coerce.number().int().min(1).max(65535).default(9090),
  /** Hostname / interface to bind. */
  host: z.string().min(1).default("0.0.0.0"),
  /** URL path that Prometheus will scrape. */
  path: z.string().startsWith("/").default("/metrics"),
  /** Milliseconds between internal collection cycles (informational). */
  scrapeIntervalMs: z.coerce.number().int().min(100).default(15000),
  /** Optional bearer token that must be present in the Authorization header. */
  bearerToken: z.string().optional(),
  /** Prefix prepended to every exported metric name. */
  metricPrefix: z.string().default("veritas"),
  /** Whether to append a Unix-millisecond timestamp to each Prometheus line. */
  includeTimestamp: z.coerce.boolean().default(false),
});

export type ExporterConfig = z.infer<typeof ConfigSchema>;

/** Build config from environment variables with safe defaults. */
export function loadConfig(): ExporterConfig {
  return ConfigSchema.parse({
    port: process.env["METRICS_PORT"],
    host: process.env["METRICS_HOST"],
    path: process.env["METRICS_PATH"],
    scrapeIntervalMs: process.env["METRICS_SCRAPE_INTERVAL_MS"],
    bearerToken: process.env["METRICS_BEARER_TOKEN"],
    metricPrefix: process.env["METRICS_PREFIX"],
    includeTimestamp: process.env["METRICS_INCLUDE_TIMESTAMP"],
  });
}
