// Provider capability descriptors: what each adapter can and cannot do
import { z } from "zod";

/** Zod schema for provider capabilities */
export const ProviderCapabilitiesSchema = z.object({
  /** Provider name (matches VerifierLLM.name) */
  providerName: z.string().min(1),
  /** Supports real-time web search during research phase */
  supportsWebSearch: z.boolean(),
  /** Can stream partial token output */
  supportsStreaming: z.boolean(),
  /** Supports tool / function calling */
  supportsFunctionCalling: z.boolean(),
  /** Supports vision / image inputs */
  supportsVision: z.boolean(),
  /** Supports extended context windows (>100k tokens) */
  supportsLongContext: z.boolean(),
  /** Maximum context window in tokens (null = unknown) */
  maxContextTokens: z.number().int().positive().nullable(),
  /** Maximum output tokens per request (null = unknown) */
  maxOutputTokens: z.number().int().positive().nullable(),
  /** Canonical list of model IDs available via this provider */
  availableModels: z.array(z.string()),
});

export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

/** Built-in capability descriptors for known adapters */
const KNOWN_CAPABILITIES: ReadonlyArray<ProviderCapabilities> = [
  {
    providerName: "anthropic",
    supportsWebSearch: true,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    supportsLongContext: true,
    maxContextTokens: 200_000,
    maxOutputTokens: 16_000,
    availableModels: ["claude-opus-4-5", "claude-sonnet-4-6", "claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  {
    providerName: "openai-compat",
    supportsWebSearch: false,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    supportsLongContext: true,
    maxContextTokens: 128_000,
    maxOutputTokens: 16_384,
    availableModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  },
  {
    providerName: "bedrock",
    supportsWebSearch: false,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    supportsLongContext: true,
    maxContextTokens: 200_000,
    maxOutputTokens: 16_000,
    availableModels: ["anthropic.claude-3-5-sonnet", "anthropic.claude-3-haiku"],
  },
  {
    providerName: "vertex",
    supportsWebSearch: false,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    supportsLongContext: true,
    maxContextTokens: 1_000_000,
    maxOutputTokens: 8_192,
    availableModels: ["gemini-1.5-pro", "gemini-1.5-flash"],
  },
  {
    providerName: "local",
    supportsWebSearch: false,
    supportsStreaming: false,
    supportsFunctionCalling: false,
    supportsVision: false,
    supportsLongContext: false,
    maxContextTokens: 4_096,
    maxOutputTokens: 2_048,
    availableModels: ["local"],
  },
  {
    providerName: "mock",
    supportsWebSearch: false,
    supportsStreaming: false,
    supportsFunctionCalling: false,
    supportsVision: false,
    supportsLongContext: false,
    maxContextTokens: null,
    maxOutputTokens: null,
    availableModels: ["mock-v1", "mock-llm-providers-v1"],
  },
  {
    providerName: "mock-llm-providers",
    supportsWebSearch: false,
    supportsStreaming: false,
    supportsFunctionCalling: false,
    supportsVision: false,
    supportsLongContext: false,
    maxContextTokens: null,
    maxOutputTokens: null,
    availableModels: ["mock-llm-providers-v1"],
  },
  {
    providerName: "failover",
    supportsWebSearch: false,
    supportsStreaming: false,
    supportsFunctionCalling: false,
    supportsVision: false,
    supportsLongContext: false,
    maxContextTokens: null,
    maxOutputTokens: null,
    availableModels: [],
  },
];

/** Return capabilities for a named provider, or undefined if not known */
export function getCapabilities(providerName: string): ProviderCapabilities | undefined {
  return KNOWN_CAPABILITIES.find((c) => c.providerName === providerName);
}

/** Return capabilities for a named provider, falling back to a safe default */
export function getCapabilitiesOrDefault(providerName: string): ProviderCapabilities {
  return (
    getCapabilities(providerName) ?? {
      providerName,
      supportsWebSearch: false,
      supportsStreaming: false,
      supportsFunctionCalling: false,
      supportsVision: false,
      supportsLongContext: false,
      maxContextTokens: null,
      maxOutputTokens: null,
      availableModels: [],
    }
  );
}

/** All built-in capability entries */
export function allCapabilities(): ReadonlyArray<ProviderCapabilities> {
  return KNOWN_CAPABILITIES;
}
