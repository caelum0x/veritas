// Scheduler app entrypoint: loads config, builds DI container, wires jobs, and starts the scheduler.
import { loadConfig } from "@veritas/config";
import { buildContainer } from "@veritas/container";
import { bootstrap } from "./bootstrap.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const container = buildContainer({ config });
  const { scheduler } = await bootstrap(container);

  scheduler.start();

  const shutdown = (): void => {
    scheduler.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err: unknown) => {
  console.error("scheduler-app: fatal startup error", err);
  process.exit(1);
});
