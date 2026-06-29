// Developer portal API entrypoint — loads config, bootstraps, and starts the server.
import { bootstrap } from "./bootstrap.js";

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal startup error: ${message}\n`);
  process.exit(1);
});
