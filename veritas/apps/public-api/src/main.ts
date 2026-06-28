// main.ts: entrypoint — calls bootstrap() and exits with code 1 on fatal startup errors.
import { bootstrap } from "./bootstrap.js";

bootstrap().catch((err: unknown) => {
  console.error("Fatal startup error", err instanceof Error ? err.message : err);
  process.exit(1);
});
