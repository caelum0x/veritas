// Zod schema for the full Veritas platform configuration object.

import { z } from "zod";
import { AnthropicConfigSchema } from "./sections/anthropic.js";
import { BillingConfigSchema } from "./sections/billing.js";
import { CrooConfigSchema } from "./sections/croo.js";
import { DatabaseConfigSchema } from "./sections/database.js";
import { ObservabilityConfigSchema } from "./sections/observability.js";
import { ServerConfigSchema } from "./sections/server.js";
import { VerificationConfigSchema } from "./sections/verification.js";

/** Root schema for the entire Veritas platform config. */
export const AppConfigSchema = z.object({
  /** CAP/CROO agent and on-chain settlement settings. */
  croo: CrooConfigSchema,
  /** Anthropic Claude API settings for the verification engine. */
  anthropic: AnthropicConfigSchema,
  /** HTTP REST API server settings. */
  server: ServerConfigSchema,
  /** Persistence (PostgreSQL + optional Redis) settings. */
  database: DatabaseConfigSchema,
  /** Billing, Stripe, and usage-pricing settings. */
  billing: BillingConfigSchema,
  /** Verification engine tuning parameters. */
  verification: VerificationConfigSchema.default({}),
  /** Logging, tracing, and metrics settings. */
  observability: ObservabilityConfigSchema.default({}),
});

export type RawAppConfig = z.input<typeof AppConfigSchema>;
