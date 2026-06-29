// Entrypoint: bootstraps the API server and exits on fatal startup errors.
import { bootstrap } from "./bootstrap.js";

bootstrap().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("[veritas-api] Fatal startup error", err);
  process.exit(1);
});
