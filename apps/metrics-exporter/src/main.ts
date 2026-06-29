// Entrypoint: load config, build exporter, start HTTP server.

import { globalRegistry } from "@veritas/observability";
import { createLogger } from "@veritas/observability";
import { loadConfig } from "./config.js";
import { createExporter } from "./exporter.js";
import { startServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ bindings: { name: "metrics-exporter" }, level: "info" });

  const exporter = createExporter({
    config,
    registries: [globalRegistry],
    logger,
  });

  const server = await startServer(exporter, config, logger);

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("shutting down metrics-exporter", { signal });
    await server.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  process.stderr.write(`metrics-exporter fatal: ${String(err)}\n`);
  process.exit(1);
});
