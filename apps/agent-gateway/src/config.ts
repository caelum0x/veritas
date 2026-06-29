// Zod-validated configuration schema and loader for the agent-gateway service.

import { z } from "zod";

export const AppConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "test", "staging", "production"]).default("development"),
  logLevel: z.enum(["silent", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Agent identity
  agentId: z.string().min(1).default("veritas.agent-gateway"),
  agentName: z.string().min(1).default("Veritas Agent Gateway"),
  agentVersion: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0"),
  agentBaseUrl: z.string().url().default("http://localhost:3000"),

  // Auth
  apiKeyHeader: z.string().default("x-api-key"),
  internalApiKey: z.string().min(1).default("dev-internal-key"),

  // Rate limiting
  rateLimitWindowMs: z.coerce.number().int().positive().default(60_000),
  rateLimitMaxRequests: z.coerce.number().int().positive().default(100),

  // CAP bridge
  capEndpoint: z.string().url().default("http://localhost:4000"),
  capMaxBudgetUsdc: z.string().default("10000000"),
  capMinAmountUsdc: z.string().default("0.50"),
  capMaxClaims: z.coerce.number().int().positive().default(50),

  // A2A protocol
  a2aProtocolVersion: z.string().default("1.0"),

  // Idempotency TTL in seconds
  idempotencyTtlSeconds: z.coerce.number().int().positive().default(86_400),

  // Request timeout
  requestTimeoutMs: z.coerce.number().int().positive().default(30_000),

  // Body size limit in bytes
  bodyLimitBytes: z.coerce.number().int().positive().default(1_048_576),

  // Anthropic LLM
  anthropicApiKey: z.string().min(1).default("not-configured"),
  anthropicModel: z.string().min(1).default("claude-sonnet-4-5"),
  anthropicFastModel: z.string().min(1).default("claude-haiku-4-5"),
  anthropicMaxTokens: z.coerce.number().int().positive().default(4096),
  anthropicConcurrency: z.coerce.number().int().positive().default(5),

  // Verification engine
  verificationConcurrency: z.coerce.number().int().positive().default(3),
  verificationMaxClaims: z.coerce.number().int().positive().default(20),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(): AppConfig {
  const result = AppConfigSchema.safeParse({
    port: process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    logLevel: process.env["LOG_LEVEL"],
    agentId: process.env["AGENT_ID"],
    agentName: process.env["AGENT_NAME"],
    agentVersion: process.env["AGENT_VERSION"],
    agentBaseUrl: process.env["AGENT_BASE_URL"],
    apiKeyHeader: process.env["API_KEY_HEADER"],
    internalApiKey: process.env["INTERNAL_API_KEY"],
    rateLimitWindowMs: process.env["RATE_LIMIT_WINDOW_MS"],
    rateLimitMaxRequests: process.env["RATE_LIMIT_MAX_REQUESTS"],
    capEndpoint: process.env["CAP_ENDPOINT"],
    capMaxBudgetUsdc: process.env["CAP_MAX_BUDGET_USDC"],
    capMinAmountUsdc: process.env["CAP_MIN_AMOUNT_USDC"],
    capMaxClaims: process.env["CAP_MAX_CLAIMS"],
    a2aProtocolVersion: process.env["A2A_PROTOCOL_VERSION"],
    idempotencyTtlSeconds: process.env["IDEMPOTENCY_TTL_SECONDS"],
    requestTimeoutMs: process.env["REQUEST_TIMEOUT_MS"],
    bodyLimitBytes: process.env["BODY_LIMIT_BYTES"],
    anthropicApiKey: process.env["ANTHROPIC_API_KEY"],
    anthropicModel: process.env["ANTHROPIC_MODEL"],
    anthropicFastModel: process.env["ANTHROPIC_FAST_MODEL"],
    anthropicMaxTokens: process.env["ANTHROPIC_MAX_TOKENS"],
    anthropicConcurrency: process.env["ANTHROPIC_CONCURRENCY"],
    verificationConcurrency: process.env["VERIFICATION_CONCURRENCY"],
    verificationMaxClaims: process.env["VERIFICATION_MAX_CLAIMS"],
  });

  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Agent-gateway configuration invalid: ${messages}`);
  }

  return result.data;
}
