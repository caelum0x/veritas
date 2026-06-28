// main: MCP server entrypoint — loads config, bootstraps, and starts the chosen transport.

import { loadMcpServerConfig } from "./config.js";
import { bootstrap } from "./bootstrap.js";
import { runStdio } from "./stdio.js";
import { runHttp } from "./http.js";

async function main(): Promise<void> {
  const config = loadMcpServerConfig();
  const { handler, logger } = bootstrap(config);

  if (config.transport === "http") {
    await runHttp(handler, logger, config.host, config.port, config.serverVersion);
  } else {
    await runStdio(handler, logger);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[veritas-mcp] fatal: ${msg}\n`);
  process.exit(1);
});
