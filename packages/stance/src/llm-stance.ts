// LLM stance port: uses VerifierLLM to classify source stance toward a claim
import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import { StanceLLMError, StanceParseError } from "./errors.js";
import { StanceSchema } from "./stance.js";
import type { Stance } from "./stance.js";
import type { StanceConfidence } from "./types.js";

const STANCE_PROMPT = (claim: string, snippet: string) =>
  `You are a fact-checking stance classifier. Given a CLAIM and a SOURCE SNIPPET, classify whether the snippet SUPPORTS, OPPOSES, or is NEUTRAL toward the claim.

CLAIM: "${claim}"

SOURCE SNIPPET: "${snippet}"

Respond with a JSON object only, no markdown:
{"stance":"supports"|"opposes"|"neutral","confidence":0.0-1.0,"reasoning":"one sentence"}`;

function parseStanceJson(raw: string): Result<StanceConfidence, StanceParseError> {
  try {
    const trimmed = raw.trim().replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== "object" || parsed === null) return err(new StanceParseError(raw));
    const obj = parsed as Record<string, unknown>;
    const stanceParsed = StanceSchema.safeParse(obj["stance"]);
    if (!stanceParsed.success) return err(new StanceParseError(raw));
    const confidence = typeof obj["confidence"] === "number"
      ? Math.max(0, Math.min(1, obj["confidence"]))
      : 0.5;
    const reasoning = typeof obj["reasoning"] === "string" ? obj["reasoning"] : "";
    return ok({ stance: stanceParsed.data, confidence, reasoning });
  } catch {
    return err(new StanceParseError(raw));
  }
}

/** Port interface for LLM-based stance detection */
export interface LLMStancePort {
  classify(
    claimText: string,
    snippet: string,
    modelId?: string,
  ): Promise<Result<StanceConfidence, StanceLLMError | StanceParseError>>;
}

/** Concrete implementation backed by VerifierLLM */
export class LLMStanceAdapter implements LLMStancePort {
  constructor(private readonly llm: VerifierLLM) {}

  async classify(
    claimText: string,
    snippet: string,
    modelId?: string,
  ): Promise<Result<StanceConfidence, StanceLLMError | StanceParseError>> {
    const prompt = STANCE_PROMPT(claimText, snippet);
    // Use adjudicate for structured output since research returns evidence items
    const adjResult = await this.llm.adjudicate(prompt, { modelId });
    if (!adjResult.ok) {
      return err(new StanceLLMError("LLM adjudicate call failed", adjResult.error));
    }
    const text = adjResult.value.explanation ?? "";
    return parseStanceJson(text);
  }
}

/** Mock implementation for testing / dev without real LLM */
export class MockLLMStanceAdapter implements LLMStancePort {
  private readonly fixedStance: Stance;
  constructor(fixedStance: Stance = "neutral") {
    this.fixedStance = fixedStance;
  }

  async classify(
    _claimText: string,
    _snippet: string,
    _modelId?: string,
  ): Promise<Result<StanceConfidence, never>> {
    return ok({ stance: this.fixedStance, confidence: 0.75, reasoning: "mock stance" });
  }
}
