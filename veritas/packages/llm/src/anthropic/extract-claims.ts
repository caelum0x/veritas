// Structured claim extraction call using JSON schema-constrained output
import type Anthropic from "@anthropic-ai/sdk";
import type { ExtractClaimsOptions, ExtractionResult, ExtractedClaim } from "../provider.js";
import type { AppError } from "@veritas/core";
import { err, ok } from "@veritas/core";
import type { Result } from "@veritas/core";
import { LLMParseError } from "../errors.js";
import { createMessage } from "./message.js";
import { extractText } from "./text.js";
import { buildExtractionPrompt } from "../prompts/extract.js";
import { EXTRACTION_CONFIG } from "./model.js";
import { ExtractionOutputSchema } from "../schemas/extraction.js";

const DEFAULT_MAX_CLAIMS = 20;

/** Raw extraction result as emitted by the model */
interface RawExtractionOutput {
  readonly claims: ReadonlyArray<{
    readonly text: string;
    readonly startOffset: number;
    readonly endOffset: number;
    readonly checkworthiness: number;
  }>;
}

/** Validate and narrow the parsed JSON into a typed extraction output */
function validateExtractionOutput(raw: unknown): RawExtractionOutput {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("claims" in raw) ||
    !Array.isArray((raw as { claims: unknown }).claims)
  ) {
    throw new TypeError(
      `Expected { claims: [] } but got: ${JSON.stringify(raw).slice(0, 200)}`,
    );
  }

  const parsed = raw as { claims: unknown[] };

  const claims = parsed.claims.map((item, idx) => {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).text !== "string" ||
      typeof (item as Record<string, unknown>).startOffset !== "number" ||
      typeof (item as Record<string, unknown>).endOffset !== "number" ||
      typeof (item as Record<string, unknown>).checkworthiness !== "number"
    ) {
      throw new TypeError(`Claim at index ${idx} has invalid shape`);
    }

    return item as {
      text: string;
      startOffset: number;
      endOffset: number;
      checkworthiness: number;
    };
  });

  return { claims };
}

/**
 * Executes claim extraction on the given content using Claude with structured JSON output.
 * Returns an ExtractionResult containing the identified check-worthy claims.
 */
export async function runExtractClaims(
  client: Anthropic,
  content: string,
  systemPrompt: string,
  options: ExtractClaimsOptions = {},
): Promise<Result<ExtractionResult, AppError>> {
  const maxClaims = options.maxClaims ?? DEFAULT_MAX_CLAIMS;
  const modelId = options.modelId ?? EXTRACTION_CONFIG.model;
  const maxOutputTokens = options.maxOutputTokens ?? EXTRACTION_CONFIG.maxTokens;

  const userMessage = buildExtractionPrompt(content, maxClaims);

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
        "Model refused to extract claims",
        extractText(message.content),
      ),
    );
  }

  const rawText = extractText(message.content);

  let parsed: unknown;
  try {
    // Strip potential markdown code fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return err(new LLMParseError("Failed to parse extraction JSON", rawText));
  }

  let validated: RawExtractionOutput;
  try {
    validated = validateExtractionOutput(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(new LLMParseError(`Extraction schema mismatch: ${msg}`, rawText));
  }

  // Validate against the shared JSON schema (runtime guard)
  const schemaResult = ExtractionOutputSchema.safeParse(parsed);
  if (!schemaResult.success) {
    return err(
      new LLMParseError(
        `Extraction output failed schema validation: ${schemaResult.error.message}`,
        rawText,
      ),
    );
  }

  const claims: ExtractedClaim[] = validated.claims
    .slice(0, maxClaims)
    .map((c) => ({
      text: c.text,
      startOffset: c.startOffset,
      endOffset: c.endOffset,
      checkworthiness: Math.min(Math.max(c.checkworthiness, 0), 1) as number & { __brand: "Score" },
    }));

  return ok({
    claims,
    tokensUsed: totalInputTokens + totalOutputTokens,
    modelId,
  });
}
