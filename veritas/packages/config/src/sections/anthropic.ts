// Anthropic API configuration section for Claude-based verification agents
import { z } from "zod";

export const AnthropicConfigSchema = z.object({
  /** Anthropic API key (sk-ant-...) */
  apiKey: z.string().min(1),
  /** Base URL for the Anthropic API */
  baseUrl: z.string().url().default("https://api.anthropic.com"),
  /** Default model for fact-verification tasks */
  model: z.string().min(1).default("claude-sonnet-4-5"),
  /** Model used for lightweight / high-throughput classification */
  fastModel: z.string().min(1).default("claude-haiku-4-5"),
  /** Max tokens to request per verification inference */
  maxTokens: z.number().int().positive().default(4096),
  /** Temperature for verification responses (lower = more deterministic) */
  temperature: z.number().min(0).max(1).default(0.2),
  /** Maximum number of concurrent Anthropic API calls */
  concurrency: z.number().int().min(1).default(5),
  /** Timeout in milliseconds for a single Anthropic API call */
  timeoutMs: z.number().int().positive().default(120_000),
  /** Maximum retry attempts on transient failures */
  maxRetries: z.number().int().min(0).default(3),
  /** Whether to enable Anthropic prompt caching for repeated system prompts */
  promptCaching: z.boolean().default(true),
});

export type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>;

export const anthropicDefaults: Partial<AnthropicConfig> = {
  baseUrl: "https://api.anthropic.com",
  model: "claude-sonnet-4-5",
  fastModel: "claude-haiku-4-5",
  maxTokens: 4096,
  temperature: 0.2,
  concurrency: 5,
  timeoutMs: 120_000,
  maxRetries: 3,
  promptCaching: true,
};
