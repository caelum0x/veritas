// Entrypoint: loads config, bootstraps the app, and starts the HTTP server.
import { bootstrap } from "./bootstrap.js";

bootstrap().catch((err: unknown) => {
  process.stderr.write(
    JSON.stringify({
      level: "fatal",
      msg: "Failed to start @veritas/ops-api",
      err: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }) + "\n",
  );
  process.exit(1);
});
