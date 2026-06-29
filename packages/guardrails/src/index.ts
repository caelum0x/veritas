// Public surface of @veritas/guardrails: types, errors, registry, pipeline, and built-in guardrails.
export type {
  GuardrailPhase,
  GuardrailDecision,
  GuardrailResult,
  GuardrailContext,
  Guardrail,
  PipelineResult,
} from "./types.js";

export { GuardrailResultSchema } from "./types.js";

export {
  GuardrailBlockedError,
  GuardrailConfigError,
  GuardrailTimeoutError,
} from "./errors.js";

export { GuardrailRegistry } from "./registry.js";

export { BaseGuardrail } from "./guardrail.js";

export { GuardrailPipeline } from "./pipeline.js";
export type { PipelineOptions } from "./pipeline.js";

export { resolveDecision, isBlocked, isRedacted, isAllowed } from "./decision.js";

// Input guardrails
export { PromptInjectionGuardrail } from "./input/prompt-injection.js";
export { JailbreakGuardrail } from "./input/jailbreak.js";
export { PiiInputGuardrail } from "./input/pii-input.js";

// Output guardrails
export { HallucinationGuardrail } from "./output/hallucination.js";
export { ToxicityGuardrail } from "./output/toxicity.js";
export { SchemaGuard } from "./output/schema-guard.js";
export type { SchemaGuardOptions } from "./output/schema-guard.js";
export { GroundednessGuardrail } from "./output/groundedness.js";
