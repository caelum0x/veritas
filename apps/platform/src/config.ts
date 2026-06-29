// Platform configuration: loads and re-exports the validated AppConfig for the unified process.

import { loadConfig } from "@veritas/config";
import type { AppConfig } from "@veritas/config";

/** Load the platform config once; throws on validation failure. */
export function getPlatformConfig(): AppConfig {
  return loadConfig();
}

export type { AppConfig };
