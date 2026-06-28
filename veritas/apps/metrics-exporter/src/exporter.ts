// Metrics exporter: wires collector → prometheus renderer and serves /metrics.

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "@veritas/observability";
import type { ExporterConfig } from "./config.js";
import { makeCollector } from "./collector.js";
import { renderPrometheusText, CONTENT_TYPE } from "./prometheus.js";
import { MetricsRegistry } from "@veritas/observability";

export interface ExporterOptions {
  readonly config: ExporterConfig;
  readonly registries: readonly MetricsRegistry[];
  readonly logger: Logger;
}

export interface Exporter {
  /** Handle an incoming HTTP request — usable as a plain Node.js request listener. */
  handleRequest(req: IncomingMessage, res: ServerResponse): void;
}

/** Create an Exporter that renders collected metrics on every scrape request. */
export function createExporter(options: ExporterOptions): Exporter {
  const { config, registries, logger } = options;
  const collect = makeCollector(registries);

  function handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    if (url !== config.path) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found\n");
      return;
    }

    if (method !== "GET" && method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain", Allow: "GET, HEAD" });
      res.end("Method Not Allowed\n");
      return;
    }

    try {
      const { samples, collectedAt } = collect();
      const body = renderPrometheusText(samples);
      logger.debug("metrics scraped", { collectedAt, sampleCount: samples.length });
      res.writeHead(200, {
        "Content-Type": CONTENT_TYPE,
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(method === "HEAD" ? undefined : body);
    } catch (err: unknown) {
      logger.error("failed to collect metrics", { err });
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error\n");
    }
  }

  return { handleRequest };
}
