// Plugin host entrypoint — parses config and runs the host process until shutdown.
import { createLogger } from "@veritas/observability";
import { bootstrapHost } from "./bootstrap.js";
import { parsePluginHostConfig } from "./config.js";

const logger = createLogger({ level: "info", bindings: { service: "plugin-host" } });

async function main(): Promise<void> {
  logger.info("plugin-host starting");

  const rawConfig = process.env["PLUGIN_HOST_CONFIG"]
    ? JSON.parse(process.env["PLUGIN_HOST_CONFIG"])
    : undefined;

  const config =
    rawConfig !== undefined ? parsePluginHostConfig(rawConfig) : undefined;

  const runtime = await bootstrapHost({ config, logger });

  const shutdown = async (): Promise<void> => {
    logger.info("received shutdown signal");
    await runtime.shutdown();
    process.exit(0);
  };

  process.once("SIGTERM", () => { void shutdown(); });
  process.once("SIGINT", () => { void shutdown(); });

  logger.info("plugin-host running", { pluginCount: runtime.plugins.size });
}

main().catch((err: unknown) => {
  logger.error("plugin-host fatal error", { err });
  process.exit(1);
});
