// Start the Veritas REST API server using the container and Express application.

import http from "node:http";
import { loadConfig } from "@veritas/config";
import { buildContainer } from "@veritas/container";

/** Attempt to load configuration; exit with a clear error if misconfigured. */
function loadOrExit(): ReturnType<typeof loadConfig> {
  try {
    return loadConfig();
  } catch (e: unknown) {
    console.error(
      "[api] Configuration error:",
      e instanceof Error ? e.message : String(e),
    );
    process.exit(1);
  }
}

/** Build the Express app dynamically to avoid importing the apps/api package directly. */
async function buildExpressApp(
  container: ReturnType<typeof buildContainer>,
  config: ReturnType<typeof loadConfig>,
): Promise<import("express").Express> {
  // Dynamically import so the examples package remains self-contained.
  const express = (await import("express")).default;
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Health-check endpoint exposed by the example server.
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "veritas-api",
      env: config.server.env,
      timestamp: new Date().toISOString(),
    });
  });

  // Metrics endpoint.
  app.get("/metrics", (_req, res) => {
    res.set("Content-Type", "text/plain");
    res.send("# Veritas metrics placeholder\n");
  });

  // Generic not-found handler.
  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Route not found" });
  });

  return app;
}

async function main(): Promise<void> {
  const config = loadOrExit();
  const port = config.server.port ?? 3000;

  console.log("=== Veritas REST API Server ===");
  console.log(`Environment: ${config.server.env}`);
  console.log(`Port       : ${port}`);

  // Build the DI container (registers repositories and services).
  const container = buildContainer({ config });

  const app = await buildExpressApp(container, config);
  const server = http.createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      console.log(`[api] Listening on http://${config.server.host}:${port}`);
      resolve();
    });
  });

  const shutdown = (signal: string): void => {
    console.log(`[api] ${signal} received — shutting down gracefully`);
    server.close((err?: Error) => {
      if (err) {
        console.error("[api] Error during shutdown:", err.message);
        process.exit(1);
      }
      console.log("[api] Server closed.");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[api] Forced shutdown after 10 s timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  console.error("run-api-server failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
