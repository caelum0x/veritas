// LLM-backed classifier port: uses VerifierLLM adjudication to classify claim type and domain.
import { z } from "zod";
import { ok, err, type Result, type AppError, InternalError } from "@veritas/core";
import { ClaimType, isClaimType } from "./claim-type.js";
import { Domain, isDomain } from "./domain.js";
import { ClassifierParseError } from "./errors.js";
import type { ClassificationResult, ClassificationContext } from "./types.js";
import type { Score } from "@veritas/core";
import { asScore, clampScore } from "@veritas/core";

/** Minimal interface required from the LLM provider for classification */
export interface ClassifierLLMPort {
  readonly name: string;
  adjudicate(
    claimText: string,
    options?: { modelId?: string; maxOutputTokens?: number },
  ): Promise<Result<{ explanation: string; confidence: Score; tokensUsed: number }, AppError>>;
}

/** Raw output shape expected from the LLM classification prompt */
const LLMClassificationSchema = z.object({
  claimType: z.string(),
  domain: z.string(),
  typeConfidence: z.number().min(0).max(1),
  domainConfidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

type LLMClassificationRaw = z.infer<typeof LLMClassificationSchema>;

/** Build a structured prompt that asks the LLM to classify a claim */
function buildClassificationPrompt(claimText: string, context: ClassificationContext): string {
  const domainHint = context.domainHint ? ` (domain hint: ${context.domainHint})` : "";
  const titleHint = context.documentTitle ? ` from document "${context.documentTitle}"` : "";
  return [
    `Classify the following factual claim${titleHint}${domainHint}.`,
    `Respond ONLY with valid JSON matching this schema:`,
    `{"claimType":"<one of: statistical|causal|definitional|predictive|quote|event|comparative>",`,
    `"domain":"<one of: financial|scientific|medical|news|crypto|legal|general>",`,
    `"typeConfidence":<0.0-1.0>,"domainConfidence":<0.0-1.0>,"reasoning":"<optional>"}`,
    ``,
    `Claim: "${claimText}"`,
  ].join("\n");
}

/** Extract JSON object from LLM explanation text that may wrap JSON in prose */
function extractJson(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in LLM output");
  return JSON.parse(jsonMatch[0]);
}

/** Map raw string to ClaimType, falling back to Definitional */
function toClaimType(raw: string): ClaimType {
  const normalized = raw.toLowerCase().trim();
  return isClaimType(normalized) ? normalized : ClaimType.Definitional;
}

/** Map raw string to Domain, falling back to General */
function toDomain(raw: string): Domain {
  const normalized = raw.toLowerCase().trim();
  return isDomain(normalized) ? normalized : Domain.General;
}

/** LLM-backed classifier: calls the LLM port and parses structured output */
export class LLMClassifier {
  constructor(private readonly llm: ClassifierLLMPort) {}

  async classify(
    claimText: string,
    context: ClassificationContext = {},
    recommendedVerifiers: ReadonlyArray<string> = [],
  ): Promise<Result<ClassificationResult, AppError>> {
    const prompt = buildClassificationPrompt(claimText, context);

    const adjResult = await this.llm.adjudicate(prompt);
    if (adjResult.ok === false) {
      return err(adjResult.error);
    }

    const { explanation } = adjResult.value;

    let raw: unknown;
    try {
      raw = extractJson(explanation);
    } catch (cause) {
      return err(
        new ClassifierParseError(
          "LLM classifier returned non-JSON output",
          explanation,
          cause,
        ),
      );
    }

    const parsed = LLMClassificationSchema.safeParse(raw);
    if (!parsed.success) {
      return err(
        new ClassifierParseError(
          "LLM classifier output failed schema validation",
          JSON.stringify(raw),
          parsed.error,
        ),
      );
    }

    const data: LLMClassificationRaw = parsed.data;
    const claimType = toClaimType(data.claimType);
    const domain = context.domainHint ?? toDomain(data.domain);
    const typeConfidence = asScore(clampScore(data.typeConfidence));
    const domainConfidence = asScore(clampScore(data.domainConfidence));
    const confidence = asScore(clampScore((data.typeConfidence + data.domainConfidence) / 2));

    return ok({
      claimText,
      claimType,
      domain,
      confidence,
      typeConfidence,
      domainConfidence,
      recommendedVerifiers,
      llmAssisted: true,
    });
  }
}

/** No-op mock LLM classifier port for testing */
export class MockClassifierLLMPort implements ClassifierLLMPort {
  readonly name = "mock-classifier";

  async adjudicate(
    claimText: string,
  ): Promise<Result<{ explanation: string; confidence: Score; tokensUsed: number }, AppError>> {
    const explanation = JSON.stringify({
      claimType: "statistical",
      domain: "general",
      typeConfidence: 0.75,
      domainConfidence: 0.65,
      reasoning: "mock classification",
    });
    return ok({ explanation, confidence: asScore(0.7), tokensUsed: claimText.length });
  }
}
