// Entry point: bootstraps auth-server and starts the HTTP listener.

import { bootstrap } from "./bootstrap.js";
import { startServer } from "./server.js";
import { registerShutdownHooks } from "./shutdown.js";

async function main(): Promise<void> {
  const { config, deps, app } = bootstrap();

  const { server, port, host } = await startServer(app, config);

  deps.logger.info("Auth-server listening", { host, port, env: config.env });

  registerShutdownHooks(server, deps.logger);
}

main().catch((err: unknown) => {
  process.stderr.write(
    `Fatal startup error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
