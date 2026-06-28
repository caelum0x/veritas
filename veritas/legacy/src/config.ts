import { z } from 'zod';
import type { LogLevel } from './logger.js';

/**
 * Centralised, schema-validated configuration. We fail fast at startup with a
 * single readable error rather than discovering a missing key mid-job.
 */
const EffortSchema = z.enum(['low', 'medium', 'high', 'max']);

const intFromEnv = (def: number, min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number().int().min(min).max(max));

const RawEnvSchema = z.object({
  CROO_API_URL: z.string().url('CROO_API_URL must be a valid URL'),
  CROO_WS_URL: z.string().url('CROO_WS_URL must be a valid ws(s) URL'),
  CROO_SDK_KEY: z.string().min(1, 'CROO_SDK_KEY is required'),
  BASE_RPC_URL: z.string().url().optional(),

  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),

  VERITAS_MODEL: z.string().optional(),
  VERITAS_EFFORT: EffortSchema.optional(),
  VERITAS_MAX_CLAIMS: intFromEnv(20, 1, 100),
  VERITAS_CONCURRENCY: intFromEnv(4, 1, 16),
  VERITAS_MAX_SEARCHES: intFromEnv(6, 1, 20),
  VERITAS_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

export interface AppConfig {
  croo: {
    apiUrl: string;
    wsUrl: string;
    sdkKey: string;
    rpcUrl?: string;
  };
  anthropic: {
    apiKey: string;
  };
  verify: {
    model: string;
    effort: z.infer<typeof EffortSchema>;
    maxClaims: number;
    concurrency: number;
    maxSearches: number;
  };
  logLevel: LogLevel;
}

export const VERITAS_VERSION = '1.0.0';
export const DEFAULT_MODEL = 'claude-opus-4-8';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = RawEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  const e = parsed.data;
  return {
    croo: {
      apiUrl: e.CROO_API_URL,
      wsUrl: e.CROO_WS_URL,
      sdkKey: e.CROO_SDK_KEY,
      rpcUrl: e.BASE_RPC_URL,
    },
    anthropic: { apiKey: e.ANTHROPIC_API_KEY },
    verify: {
      model: e.VERITAS_MODEL ?? DEFAULT_MODEL,
      effort: e.VERITAS_EFFORT ?? 'high',
      maxClaims: e.VERITAS_MAX_CLAIMS,
      concurrency: e.VERITAS_CONCURRENCY,
      maxSearches: e.VERITAS_MAX_SEARCHES,
    },
    logLevel: e.VERITAS_LOG_LEVEL ?? 'info',
  };
}
