// AppConfig type — the fully-parsed, runtime-validated platform configuration.

import { z } from "zod";
import { AppConfigSchema } from "./schema.js";

/** Fully-parsed Veritas platform configuration with all defaults resolved. */
export type AppConfig = z.infer<typeof AppConfigSchema>;
