// Model IDs and effort configuration for Anthropic Claude models
/** Available Claude model IDs for the verifier */
export const CLAUDE_OPUS = "claude-opus-4-8" as const;
export const CLAUDE_SONNET = "claude-sonnet-4-6" as const;
export const CLAUDE_HAIKU = "claude-haiku-4-5" as const;

export type ClaudeModelId =
  | typeof CLAUDE_OPUS
  | typeof CLAUDE_SONNET
  | typeof CLAUDE_HAIKU;

/** Default model used for adjudication (highest accuracy) */
export const DEFAULT_ADJUDICATION_MODEL: ClaudeModelId = CLAUDE_OPUS;

/** Default model used for research (balanced speed + accuracy) */
export const DEFAULT_RESEARCH_MODEL: ClaudeModelId = CLAUDE_SONNET;

/** Default model used for extraction (fast, cost-effective) */
export const DEFAULT_EXTRACTION_MODEL: ClaudeModelId = CLAUDE_SONNET;

/** Effort levels supported by Claude Opus 4.x and Sonnet 4.6 */
export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max";

/** Per-task effort configuration */
export interface ModelEffortConfig {
  readonly model: ClaudeModelId;
  readonly effort: EffortLevel;
  readonly maxTokens: number;
}

export const RESEARCH_CONFIG: ModelEffortConfig = {
  model: DEFAULT_RESEARCH_MODEL,
  effort: "high",
  maxTokens: 8192,
};

export const ADJUDICATION_CONFIG: ModelEffortConfig = {
  model: DEFAULT_ADJUDICATION_MODEL,
  effort: "high",
  maxTokens: 4096,
};

export const EXTRACTION_CONFIG: ModelEffortConfig = {
  model: DEFAULT_EXTRACTION_MODEL,
  effort: "medium",
  maxTokens: 4096,
};
