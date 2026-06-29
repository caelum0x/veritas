// Entrypoint: loads config and starts the billing-api HTTP server.

import { loadConfig } from "./config.js";
import { startBootstrapped } from "./bootstrap.js";

async function main(): Promise<void> {
  const config = loadConfig();
  await startBootstrapped(config);
}

main().catch((err: unknown) => {
  console.error("billing-api: fatal startup error", err);
  process.exit(1);
});
