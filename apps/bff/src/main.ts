// BFF entrypoint: loads configuration, builds app, and starts HTTP server.
import { createServer } from "node:http";
import { requireEnv, optionalEnv, envInt } from "@veritas/config";
import { createLogger } from "@veritas/observability";
import { buildBffApp, type BffAppConfig } from "./app.js";

function loadBffConfig(): BffAppConfig {
  return {
    corsOrigins: optionalEnv("BFF_CORS_ORIGINS", "*")
      .split(",")
      .map((s) => s.trim()),
    sessionSecret: requireEnv("BFF_SESSION_SECRET"),
    upstream: {
      baseUrl: requireEnv("VERITAS_API_URL"),
      serviceToken: requireEnv("BFF_SERVICE_TOKEN"),
      timeoutMs: envInt("BFF_UPSTREAM_TIMEOUT_MS", 30_000),
    },
    apiKey: requireEnv("VERITAS_API_KEY"),
    apiBaseUrl: requireEnv("VERITAS_API_URL"),
  };
}

async function main(): Promise<void> {
  const logger = createLogger({
    level: optionalEnv("LOG_LEVEL", "info"),
    bindings: { service: "bff" },
  });

  const config = loadBffConfig();
  const app = buildBffApp(config, logger);
  const port = envInt("PORT", 4000);
  const host = optionalEnv("HOST", "0.0.0.0");

  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, resolve);
    server.once("error", reject);
  });

  logger.info("BFF server listening", { host, port });

  const shutdown = (signal: string) => {
    logger.info("BFF shutting down", { signal });
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  console.error("Fatal BFF startup error", err);
  process.exit(1);
});
