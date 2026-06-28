// SDK configuration schema, defaults, and resolved config type.
import { z } from "zod";

export const DEFAULT_BASE_URL = "https://api.veritas.croo.io/v1";
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_USER_AGENT = "veritas-sdk/1.0.0";

export const SdkConfigSchema = z.object({
  apiKey: z.string().min(1, "apiKey is required"),
  baseUrl: z.string().url().default(DEFAULT_BASE_URL),
  timeoutMs: z.number().int().positive().default(DEFAULT_TIMEOUT_MS),
  maxRetries: z.number().int().min(0).max(10).default(DEFAULT_MAX_RETRIES),
  userAgent: z.string().default(DEFAULT_USER_AGENT),
  /** Optional wallet address for CAP/A2A flows */
  walletAddress: z.string().optional(),
  /** Optional idempotency key prefix */
  idempotencyKeyPrefix: z.string().optional(),
});

export type SdkConfigInput = z.input<typeof SdkConfigSchema>;
export type SdkConfig = z.output<typeof SdkConfigSchema>;

export function resolveConfig(input: SdkConfigInput): SdkConfig {
  const parsed = SdkConfigSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid SDK config: ${issues}`);
  }
  return parsed.data;
}
