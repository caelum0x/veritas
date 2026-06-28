// Admin API entrypoint — bootstraps the service and handles top-level errors.
import { bootstrap } from "./bootstrap.js";

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal startup error: ${message}\n`);
  process.exit(1);
});
