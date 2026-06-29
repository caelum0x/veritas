// Thin factory for the @anthropic-ai/sdk Anthropic client, configured from AnthropicConfig
import Anthropic from "@anthropic-ai/sdk";
import type { AnthropicConfig } from "@veritas/config";

/** Options that can override defaults for a single client instance */
export interface ClientOptions {
  /** Override API key */
  readonly apiKey?: string;
  /** Override base URL */
  readonly baseUrl?: string;
  /** Maximum number of automatic retries on transient failures */
  readonly maxRetries?: number;
  /** Timeout in milliseconds for a single request */
  readonly timeoutMs?: number;
}

/**
 * Create an Anthropic SDK client instance from an AnthropicConfig section.
 * Optional overrides can be applied per-call-site without mutating the config.
 */
export function createAnthropicClient(
  config: AnthropicConfig,
  overrides: ClientOptions = {},
): Anthropic {
  const apiKey = overrides.apiKey ?? config.apiKey;

  if (!apiKey) {
    throw new Error("Anthropic API key is required but was not provided");
  }

  return new Anthropic({
    apiKey,
    baseURL: overrides.baseUrl ?? config.baseUrl,
    maxRetries: overrides.maxRetries ?? config.maxRetries,
    timeout: overrides.timeoutMs ?? config.timeoutMs,
  });
}

/**
 * Reuse the same Anthropic instance within a scope to avoid creating one
 * per request while still allowing config-driven configuration.
 */
export class AnthropicClientPool {
  private client: Anthropic | null = null;

  constructor(private readonly config: AnthropicConfig) {}

  /** Return the cached client, creating it on first access */
  get(): Anthropic {
    if (!this.client) {
      this.client = createAnthropicClient(this.config);
    }
    return this.client;
  }

  /** Replace the current client (e.g. after config change) */
  invalidate(): void {
    this.client = null;
  }
}
