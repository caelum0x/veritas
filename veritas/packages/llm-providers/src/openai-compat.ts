// OpenAI-compatible port: implements VerifierLLM against any /v1/chat/completions endpoint
import { ok, err, AppError } from "@veritas/core";
import type { Result } from "@veritas/core";
import { asScore, clampScore, Verdict } from "@veritas/core";
import {
  LLMUnavailableError,
  LLMRateLimitError,
  LLMRefusalError,
  LLMParseError,
} from "@veritas/llm";
import type {
  VerifierLLM,
  ExtractClaimsOptions,
  ResearchOptions,
  AdjudicateOptions,
  ExtractionResult,
  ExtractedClaim,
} from "@veritas/llm";
import type { ResearchResult, ClaimAdjudication, EvidenceItem } from "@veritas/llm";
import { z } from "zod";

/** Configuration for the OpenAI-compatible endpoint */
export interface OpenAICompatConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly defaultModel: string;
  readonly providerName?: string;
  readonly timeoutMs?: number;
}

const ExtractionResponseSchema = z.object({
  claims: z.array(
    z.object({
      text: z.string(),
      startOffset: z.number().nullable().optional(),
      endOffset: z.number().nullable().optional(),
      checkworthiness: z.number().min(0).max(1),
    }),
  ),
});

const AdjudicationResponseSchema = z.object({
  verdict: z.enum(["SUPPORTED", "REFUTED", "UNVERIFIABLE", "DISPUTED"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  supportingEvidence: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      snippet: z.string(),
      publishedAt: z.string().nullable(),
      stance: z.enum(["supports", "refutes", "neutral"]),
      relevanceScore: z.number().min(0).max(1),
    }),
  ),
  contradictingEvidence: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      snippet: z.string(),
      publishedAt: z.string().nullable(),
      stance: z.enum(["supports", "refutes", "neutral"]),
      relevanceScore: z.number().min(0).max(1),
    }),
  ),
});

async function chatComplete(
  config: OpenAICompatConfig,
  model: string,
  systemPrompt: string,
  userMessage: string,
  signal?: AbortSignal,
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const providerName = config.providerName ?? "openai-compat";
  const controller = new AbortController();
  const timer = config.timeoutMs
    ? setTimeout(() => controller.abort(), config.timeoutMs)
    : null;

  const combinedSignal = signal
    ? anySignal([signal, controller.signal])
    : controller.signal;

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
      signal: combinedSignal,
    });
  } catch (cause) {
    throw new LLMUnavailableError(
      `Network error calling ${providerName}`,
      providerName,
      cause,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "5") * 1000;
    throw new LLMRateLimitError(`Rate limited by ${providerName}`, retryAfter);
  }
  if (!res.ok) {
    throw new LLMUnavailableError(
      `${providerName} returned HTTP ${res.status}`,
      providerName,
    );
  }

  const body = (await res.json()) as Record<string, unknown>;
  const choice = (body["choices"] as Array<Record<string, unknown>> | undefined)?.[0];
  const message = choice?.["message"] as Record<string, unknown> | undefined;
  const content = message?.["content"];

  if (typeof content !== "string") {
    throw new LLMRefusalError(`No content in ${providerName} response`, providerName);
  }

  const usage = body["usage"] as Record<string, unknown> | undefined;
  return {
    content,
    inputTokens: Number(usage?.["prompt_tokens"] ?? 0),
    outputTokens: Number(usage?.["completion_tokens"] ?? 0),
  };
}

/** Merge multiple AbortSignals — aborts when any fires */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

function toEvidenceItem(raw: z.infer<typeof AdjudicationResponseSchema>["supportingEvidence"][number]): EvidenceItem {
  return {
    url: raw.url,
    title: raw.title,
    snippet: raw.snippet,
    publishedAt: raw.publishedAt,
    stance: raw.stance,
    relevanceScore: asScore(clampScore(raw.relevanceScore)),
  };
}

/**
 * OpenAI-compatible provider — works with any endpoint that speaks /v1/chat/completions.
 * JSON mode is used for structured outputs.
 */
export class OpenAICompatProvider implements VerifierLLM {
  readonly name: string;
  private readonly config: OpenAICompatConfig;

  constructor(config: OpenAICompatConfig) {
    this.config = config;
    this.name = config.providerName ?? "openai-compat";
  }

  async extractClaims(
    documentText: string,
    options: ExtractClaimsOptions = {},
  ): Promise<Result<ExtractionResult, AppError>> {
    const model = options.modelId ?? this.config.defaultModel;
    const maxClaims = options.maxClaims ?? 10;

    const system = `You extract factual claims from documents. Return JSON matching: {"claims":[{"text":string,"startOffset":number|null,"endOffset":number|null,"checkworthiness":number}]}. Extract at most ${maxClaims} claims.`;

    try {
      const { content, inputTokens, outputTokens } = await chatComplete(
        this.config,
        model,
        system,
        documentText,
        options.signal,
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return err(new LLMParseError("Invalid JSON from extraction", content));
      }

      const validated = ExtractionResponseSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Extraction schema mismatch", content));
      }

      const claims: ReadonlyArray<ExtractedClaim> = validated.data.claims.map((c) => ({
        text: c.text,
        startOffset: c.startOffset ?? null,
        endOffset: c.endOffset ?? null,
        checkworthiness: clampScore(c.checkworthiness),
      }));

      return ok({ claims, tokensUsed: inputTokens + outputTokens, modelId: model });
    } catch (cause) {
      if (cause instanceof AppError) return err(cause);
      return err(new LLMUnavailableError(String(cause), this.name, cause));
    }
  }

  async research(
    claimText: string,
    options: ResearchOptions = {},
  ): Promise<Result<ResearchResult, AppError>> {
    const model = options.modelId ?? this.config.defaultModel;
    const maxQueries = options.maxSearchQueries ?? 3;

    const system = `You research factual claims. Return JSON: {"evidence":[{"url":string,"title":string,"snippet":string,"publishedAt":string|null,"stance":"supports"|"refutes"|"neutral","relevanceScore":number}],"searchQueriesIssued":number}. Issue at most ${maxQueries} conceptual search queries.`;

    try {
      const { content, inputTokens, outputTokens } = await chatComplete(
        this.config,
        model,
        system,
        `Research this claim: ${claimText}`,
        options.signal,
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return err(new LLMParseError("Invalid JSON from research", content));
      }

      const ResearchSchema = z.object({
        evidence: z.array(
          z.object({
            url: z.string(),
            title: z.string(),
            snippet: z.string(),
            publishedAt: z.string().nullable(),
            stance: z.enum(["supports", "refutes", "neutral"]),
            relevanceScore: z.number().min(0).max(1),
          }),
        ),
        searchQueriesIssued: z.number().int().min(0),
      });

      const validated = ResearchSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Research schema mismatch", content));
      }

      const evidence: ReadonlyArray<EvidenceItem> = validated.data.evidence.map((e) => ({
        url: e.url,
        title: e.title,
        snippet: e.snippet,
        publishedAt: e.publishedAt,
        stance: e.stance,
        relevanceScore: asScore(clampScore(e.relevanceScore)),
      }));

      return ok({
        claimText,
        evidence,
        tokensUsed: inputTokens + outputTokens,
        modelId: model,
        searchQueriesIssued: validated.data.searchQueriesIssued,
      });
    } catch (cause) {
      if (cause instanceof AppError) return err(cause);
      return err(new LLMUnavailableError(String(cause), this.name, cause));
    }
  }

  async adjudicate(
    claimText: string,
    options: AdjudicateOptions = {},
  ): Promise<Result<ClaimAdjudication, AppError>> {
    const model = options.modelId ?? this.config.defaultModel;
    const prior = options.researchResult;

    const context = prior
      ? `\n\nResearch evidence:\n${prior.evidence.map((e) => `- [${e.stance}] ${e.title}: ${e.snippet}`).join("\n")}`
      : "";

    const system = `You adjudicate factual claims. Return JSON: {"verdict":"SUPPORTED"|"REFUTED"|"UNVERIFIABLE"|"DISPUTED","confidence":number,"explanation":string,"supportingEvidence":[...],"contradictingEvidence":[...]}. Each evidence item: {url,title,snippet,publishedAt,stance,relevanceScore}.`;

    try {
      const { content, inputTokens, outputTokens } = await chatComplete(
        this.config,
        model,
        system,
        `Adjudicate: ${claimText}${context}`,
        options.signal,
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return err(new LLMParseError("Invalid JSON from adjudication", content));
      }

      const validated = AdjudicationResponseSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Adjudication schema mismatch", content));
      }

      const d = validated.data;
      const priorTokens = prior?.tokensUsed ?? 0;

      return ok({
        claimText,
        verdict: d.verdict as Verdict,
        confidence: asScore(clampScore(d.confidence)),
        explanation: d.explanation,
        supportingEvidence: d.supportingEvidence.map(toEvidenceItem),
        contradictingEvidence: d.contradictingEvidence.map(toEvidenceItem),
        tokensUsed: inputTokens + outputTokens + priorTokens,
        modelId: model,
      });
    } catch (cause) {
      if (cause instanceof AppError) return err(cause);
      return err(new LLMUnavailableError(String(cause), this.name, cause));
    }
  }
}
