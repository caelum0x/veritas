// Shared types for the guardrails pipeline: contexts, results, and decisions.
import { z } from "zod";
import type { Result } from "@veritas/core";

export type GuardrailPhase = "input" | "output";

export type GuardrailDecision = "allow" | "block" | "redact";

export const GuardrailResultSchema = z.object({
  guardrailId: z.string(),
  phase: z.enum(["input", "output"]),
  decision: z.enum(["allow", "block", "redact"]),
  reason: z.string().optional(),
  score: z.number().min(0).max(1).optional(),
  redactedContent: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type GuardrailResult = z.infer<typeof GuardrailResultSchema>;

export interface GuardrailContext {
  readonly requestId: string;
  readonly agentId?: string;
  readonly userId?: string;
  readonly content: string;
  readonly phase: GuardrailPhase;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface Guardrail {
  readonly id: string;
  readonly phase: GuardrailPhase;
  run(ctx: GuardrailContext): Promise<Result<GuardrailResult>>;
}

export interface PipelineResult {
  readonly requestId: string;
  readonly phase: GuardrailPhase;
  readonly finalDecision: GuardrailDecision;
  readonly results: readonly GuardrailResult[];
  readonly redactedContent?: string;
}
