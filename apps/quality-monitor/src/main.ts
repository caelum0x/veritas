// Quality monitor entrypoint — bootstraps service and exposes HTTP health endpoint.

import { bootstrap } from "./bootstrap.js";
import { DEFAULT_CONFIG } from "./config.js";

const bundle = bootstrap(DEFAULT_CONFIG);

process.on("SIGTERM", () => {
  bundle.monitor.reset();
  process.exit(0);
});

export { bundle };
