// VerifierLLM implementation using the Anthropic Claude API with web_search
import { ok, err, isOk, type Result, asScore, Verdict, safeParseJson } from "@veritas/core";
import type { AppError } from "@veritas/core";
import type { AnthropicConfig } from "@veritas/config";
import type {
  VerifierLLM,
  ExtractClaimsOptions,
  ResearchOptions,
  AdjudicateOptions,
  ExtractionResult,
  ExtractedClaim,
} from "../provider.js";
import type { ResearchResult, ClaimAdjudication, EvidenceItem } from "../types.js";
import {
  LLMUnavailableError,
  LLMParseError,
  LLMRefusalError,
} from "../errors.js";
import { AnthropicClientPool } from "./client.js";
import { createMessage } from "./message.js";
import { runResearch } from "./research.js";
import { extractText } from "./text.js";
import { buildExtractionPrompt, extractionContext } from "../prompts/extract.js";
import { ExtractionOutputSchema } from "../schemas/extraction.js";
import { AdjudicationOutputSchema } from "../schemas/adjudication.js";
import {
  EXTRACTION_CONFIG,
  ADJUDICATION_CONFIG,
  DEFAULT_ADJUDICATION_MODEL,
} from "./model.js";

const VERIFIER_SYSTEM_PROMPT =
  "You are a professional fact-verification analyst. " +
  "Your task is to assess factual claims against reliable evidence with precision and objectivity. " +
  "Always base your verdicts on evidence, not assumption. Be concise and structured in your output.";

const ADJUDICATION_SYSTEM_PROMPT =
  "You are a senior fact-checker. Given a claim and gathered evidence, " +
  "produce a structured adjudication with verdict, confidence (0-1), explanation, " +
  "and arrays of supporting and contradicting evidence. " +
  "Return ONLY valid JSON conforming to the adjudication schema.";

const DEFAULT_MAX_CLAIMS = 10;

/** Map raw verdict string from LLM to the Verdict enum */
function mapVerdict(raw: string): Verdict {
  const upper = raw.toUpperCase();
  switch (upper) {
    case "TRUE":
    case "MOSTLY_TRUE":
    case "SUPPORTED": return Verdict.SUPPORTED;
    case "FALSE":
    case "MOSTLY_FALSE":
    case "REFUTED": return Verdict.REFUTED;
    case "MISLEADING":
    case "DISPUTED":
    case "UNVERIFIABLE":
    default: return Verdict.UNVERIFIABLE;
  }
}

/**
 * AnthropicProvider implements VerifierLLM using Claude with extended thinking
 * and the web_search tool for evidence gathering.
 */
export class AnthropicProvider implements VerifierLLM {
  readonly name = "anthropic";

  private readonly pool: AnthropicClientPool;

  constructor(private readonly config: AnthropicConfig) {
    this.pool = new AnthropicClientPool(config);
  }

  async extractClaims(
    documentText: string,
    options?: ExtractClaimsOptions,
  ): Promise<Result<ExtractionResult, AppError>> {
    const maxClaims = options?.maxClaims ?? DEFAULT_MAX_CLAIMS;
    const modelId = options?.modelId ?? EXTRACTION_CONFIG.model;
    const maxTokens = options?.maxOutputTokens ?? EXTRACTION_CONFIG.maxTokens;

    const systemPrompt =
      VERIFIER_SYSTEM_PROMPT +
      "\n" +
      extractionContext(documentText.length);

    const userMessage = buildExtractionPrompt(documentText, maxClaims);

    const result = await createMessage({
      client: this.pool.get(),
      model: modelId,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens,
      signal: options?.signal,
    });

    if (!isOk(result)) return err(result.error);

    const { message, totalInputTokens, totalOutputTokens } = result.value;

    if (message.stop_reason === "refusal") {
      return err(
        new LLMRefusalError("Model refused to extract claims", this.name),
      );
    }

    const rawText = extractText(message.content);
    const parsed = safeParseJson(rawText);

    if (!parsed.ok) {
      return err(
        new LLMParseError(
          "Failed to parse extraction response as JSON",
          rawText,
        ),
      );
    }

    const validated = ExtractionOutputSchema.safeParse(parsed.value);
    if (!validated.success) {
      return err(
        new LLMParseError(
          `Extraction output did not match schema: ${validated.error.message}`,
          rawText,
        ),
      );
    }

    const claims: ExtractedClaim[] = validated.data.claims.map((c) => ({
      text: c.text,
      startOffset: c.startOffset,
      endOffset: c.endOffset,
      checkworthiness: c.checkworthiness,
    }));

    return ok({
      claims,
      tokensUsed: totalInputTokens + totalOutputTokens,
      modelId,
    });
  }

  async research(
    claimText: string,
    options?: ResearchOptions,
  ): Promise<Result<ResearchResult, AppError>> {
    if (options?.enableWebSearch === false) {
      return err(
        new LLMUnavailableError(
          "Web search disabled but required for research phase",
          this.name,
        ),
      );
    }

    return runResearch(
      this.pool.get(),
      claimText,
      VERIFIER_SYSTEM_PROMPT,
      options,
    );
  }

  async adjudicate(
    claimText: string,
    options?: AdjudicateOptions,
  ): Promise<Result<ClaimAdjudication, AppError>> {
    const modelId = options?.modelId ?? DEFAULT_ADJUDICATION_MODEL;
    const maxTokens = options?.maxOutputTokens ?? ADJUDICATION_CONFIG.maxTokens;
    const prior = options?.researchResult;

    const evidenceSummary =
      prior && prior.evidence.length > 0
        ? prior.evidence
            .map(
              (e) =>
                `[${e.stance.toUpperCase()}] ${e.title} (${e.url})\n${e.snippet}`,
            )
            .join("\n\n")
        : "No prior research evidence available.";

    const userMessage = [
      `Adjudicate the following claim:`,
      `"${claimText}"`,
      "",
      "Gathered evidence:",
      evidenceSummary,
      "",
      "Return ONLY a JSON object matching the adjudication schema with fields:",
      "verdict, confidence, explanation, supportingEvidence, contradictingEvidence.",
    ].join("\n");

    const result = await createMessage({
      client: this.pool.get(),
      model: modelId,
      system: ADJUDICATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      maxTokens,
      thinking: { type: "adaptive" },
      signal: options?.signal,
    });

    if (!isOk(result)) return err(result.error);

    const { message, totalInputTokens, totalOutputTokens } = result.value;

    if (message.stop_reason === "refusal") {
      return err(
        new LLMRefusalError("Model refused to adjudicate claim", this.name),
      );
    }

    const rawText = extractText(message.content);
    const parsed = safeParseJson(rawText);

    if (!parsed.ok) {
      return err(
        new LLMParseError("Failed to parse adjudication JSON", rawText),
      );
    }

    const validated = AdjudicationOutputSchema.safeParse(parsed.value);
    if (!validated.success) {
      return err(
        new LLMParseError(
          `Adjudication output invalid: ${validated.error.message}`,
          rawText,
        ),
      );
    }

    const data = validated.data;

    const toEvidence = (
      items: typeof data.supportingEvidence,
    ): EvidenceItem[] =>
      items.map((e) => ({
        url: e.url,
        title: e.title,
        snippet: e.snippet,
        publishedAt: e.publishedAt,
        stance: e.stance,
        relevanceScore: asScore(e.relevanceScore),
      }));

    return ok({
      claimText,
      verdict: mapVerdict(data.verdict),
      confidence: asScore(data.confidence),
      explanation: data.explanation,
      supportingEvidence: toEvidence(data.supportingEvidence),
      contradictingEvidence: toEvidence(data.contradictingEvidence),
      tokensUsed: totalInputTokens + totalOutputTokens,
      modelId,
    });
  }
}
