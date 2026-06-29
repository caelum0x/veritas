// Phase 2: structured adjudication call producing a ClaimAdjudication
import type Anthropic from "@anthropic-ai/sdk";
import type { ClaimAdjudication, EvidenceItem } from "../types.js";
import type { AdjudicateOptions } from "../provider.js";
import type { AppError, Verdict } from "@veritas/core";
import { err, ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import { LLMParseError } from "../errors.js";
import { createMessage } from "./message.js";
import { extractText } from "./text.js";
import { calibrateConfidence } from "./calibrate.js";
import { buildAdjudicationPrompt } from "../prompts/adjudicate.js";
import { AdjudicationOutputSchema } from "../schemas/adjudication.js";
import { ADJUDICATION_CONFIG } from "./model.js";

/** Raw adjudication output as emitted by the model */
interface RawAdjudication {
  readonly verdict: string;
  readonly confidence: number;
  readonly explanation: string;
  readonly supportingEvidenceUrls: ReadonlyArray<string>;
  readonly contradictingEvidenceUrls: ReadonlyArray<string>;
}

const VALID_VERDICTS: ReadonlySet<string> = new Set([
  "TRUE",
  "FALSE",
  "MOSTLY_TRUE",
  "MOSTLY_FALSE",
  "UNCERTAIN",
  "UNVERIFIABLE",
]);

/** Validate and narrow the parsed JSON to a typed adjudication output */
function validateAdjudicationOutput(raw: unknown): RawAdjudication {
  if (typeof raw !== "object" || raw === null) {
    throw new TypeError(`Expected object, got ${typeof raw}`);
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.verdict !== "string" || !VALID_VERDICTS.has(obj.verdict)) {
    throw new TypeError(
      `Invalid verdict "${obj.verdict}". Must be one of: ${[...VALID_VERDICTS].join(", ")}`,
    );
  }

  if (typeof obj.confidence !== "number") {
    throw new TypeError(`confidence must be a number, got ${typeof obj.confidence}`);
  }

  if (typeof obj.explanation !== "string" || obj.explanation.trim() === "") {
    throw new TypeError("explanation must be a non-empty string");
  }

  if (!Array.isArray(obj.supportingEvidenceUrls)) {
    throw new TypeError("supportingEvidenceUrls must be an array");
  }

  if (!Array.isArray(obj.contradictingEvidenceUrls)) {
    throw new TypeError("contradictingEvidenceUrls must be an array");
  }

  return {
    verdict: obj.verdict,
    confidence: obj.confidence,
    explanation: obj.explanation,
    supportingEvidenceUrls: obj.supportingEvidenceUrls as string[],
    contradictingEvidenceUrls: obj.contradictingEvidenceUrls as string[],
  };
}

/** Filter evidence items by URL membership in a set */
function filterEvidenceByUrls(
  evidence: ReadonlyArray<EvidenceItem>,
  urls: ReadonlyArray<string>,
): EvidenceItem[] {
  const urlSet = new Set(urls);
  return evidence.filter((e) => urlSet.has(e.url));
}

/**
 * Executes phase-2 adjudication for a claim using Claude with structured JSON output.
 * Accepts optional pre-fetched research evidence to ground the verdict.
 */
export async function runAdjudicate(
  client: Anthropic,
  claimText: string,
  systemPrompt: string,
  options: AdjudicateOptions = {},
): Promise<Result<ClaimAdjudication, AppError>> {
  const modelId = options.modelId ?? ADJUDICATION_CONFIG.model;
  const maxOutputTokens = options.maxOutputTokens ?? ADJUDICATION_CONFIG.maxTokens;
  const researchResult = options.researchResult;

  const userMessage = buildAdjudicationPrompt(claimText, researchResult);

  const result = await createMessage({
    client,
    model: modelId,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: maxOutputTokens,
    thinking: { type: "adaptive" },
    signal: options.signal,
  });

  if (!result.ok) return err(result.error);

  const { message, totalInputTokens, totalOutputTokens } = result.value;

  if (message.stop_reason === "refusal") {
    return err(
      new LLMParseError(
        "Model refused to adjudicate claim",
        extractText(message.content),
      ),
    );
  }

  const rawText = extractText(message.content);

  let parsed: unknown;
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return err(new LLMParseError("Failed to parse adjudication JSON", rawText));
  }

  let validated: RawAdjudication;
  try {
    validated = validateAdjudicationOutput(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(
      new LLMParseError(`Adjudication schema mismatch: ${msg}`, rawText),
    );
  }

  // Validate against the shared JSON schema (runtime guard)
  const schemaResult = AdjudicationOutputSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return err(
      new LLMParseError(
        `Adjudication output failed schema validation: ${schemaResult.error.message}`,
        rawText,
      ),
    );
  }

  const verdict = validated.verdict as Verdict;
  const calibratedConfidence = calibrateConfidence(validated.confidence, verdict);

  const allEvidence: ReadonlyArray<EvidenceItem> =
    researchResult?.evidence ?? [];

  const supportingEvidence = filterEvidenceByUrls(
    allEvidence,
    validated.supportingEvidenceUrls,
  );

  const contradictingEvidence = filterEvidenceByUrls(
    allEvidence,
    validated.contradictingEvidenceUrls,
  );

  return ok({
    claimText,
    verdict,
    confidence: calibratedConfidence,
    explanation: validated.explanation,
    supportingEvidence,
    contradictingEvidence,
    tokensUsed: totalInputTokens + totalOutputTokens,
    modelId,
  });
}
