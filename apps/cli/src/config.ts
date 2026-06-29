// CLI configuration loaded from environment variables and defaults
import { z } from "zod";

const cliConfigSchema = z.object({
  apiUrl: z.string().url().default("https://api.veritas.io"),
  apiKey: z.string().optional(),
  outputFormat: z.enum(["table", "json"]).default("table"),
  timeout: z.coerce.number().int().positive().default(30000),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  noColor: z.boolean().default(false),
});

export type CliConfig = z.infer<typeof cliConfigSchema>;

export function loadCliConfig(): CliConfig {
  return cliConfigSchema.parse({
    apiUrl: process.env["VERITAS_API_URL"],
    apiKey: process.env["VERITAS_API_KEY"],
    outputFormat: process.env["VERITAS_OUTPUT_FORMAT"],
    timeout: process.env["VERITAS_TIMEOUT"],
    logLevel: process.env["VERITAS_LOG_LEVEL"],
    noColor: process.env["NO_COLOR"] !== undefined || process.env["VERITAS_NO_COLOR"] === "1",
  });
}

export const DEFAULT_API_URL = "https://api.veritas.io";
export const CONFIG_ENV_PREFIX = "VERITAS_";
