// Local model port: implements VerifierLLM against any Ollama-compatible /api/generate endpoint
import { ok, err, AppError } from "@veritas/core";
import type { Result } from "@veritas/core";
import { asScore, clampScore, Verdict } from "@veritas/core";
import {
  LLMUnavailableError,
  LLMParseError,
  LLMRefusalError,
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

/** Configuration for a local Ollama-compatible server */
export interface LocalPortConfig {
  /** Base URL of the local inference server, e.g. http://localhost:11434 */
  readonly baseUrl: string;
  readonly defaultModel: string;
  readonly providerName?: string;
  readonly timeoutMs?: number;
}

const EvidenceItemSchema = z.object({
  url: z.string(),
  title: z.string(),
  snippet: z.string(),
  publishedAt: z.string().nullable(),
  stance: z.enum(["supports", "refutes", "neutral"]),
  relevanceScore: z.number().min(0).max(1),
});

const ExtractionSchema = z.object({
  claims: z.array(
    z.object({
      text: z.string(),
      startOffset: z.number().nullable().optional(),
      endOffset: z.number().nullable().optional(),
      checkworthiness: z.number().min(0).max(1),
    }),
  ),
});

const AdjudicationSchema = z.object({
  verdict: z.enum(["SUPPORTED", "REFUTED", "UNVERIFIABLE", "DISPUTED"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  supportingEvidence: z.array(EvidenceItemSchema),
  contradictingEvidence: z.array(EvidenceItemSchema),
});

const ResearchSchema = z.object({
  evidence: z.array(EvidenceItemSchema),
  searchQueriesIssued: z.number().int().min(0),
});

function toEvidenceItem(raw: z.infer<typeof EvidenceItemSchema>): EvidenceItem {
  return { ...raw, relevanceScore: asScore(clampScore(raw.relevanceScore)) };
}

/** Ollama /api/generate response (non-streaming) */
interface OllamaResponse {
  response: string;
  done: boolean;
  eval_count?: number;
  prompt_eval_count?: number;
}

async function ollamaGenerate(
  config: LocalPortConfig,
  model: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<{ text: string; tokensUsed: number }> {
  const providerName = config.providerName ?? "local";
  const url = `${config.baseUrl}/api/generate`;

  const controller = new AbortController();
  const timer = config.timeoutMs
    ? setTimeout(() => controller.abort(), config.timeoutMs)
    : null;

  const combinedSignal = signal
    ? anySignal([signal, controller.signal])
    : controller.signal;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
      signal: combinedSignal,
    });
  } catch (cause) {
    throw new LLMUnavailableError(`Cannot reach local model at ${config.baseUrl}`, providerName, cause);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LLMUnavailableError(
      `Local model HTTP ${res.status}: ${text.slice(0, 200)}`,
      providerName,
    );
  }

  const body = (await res.json()) as OllamaResponse;
  const tokensUsed = (body.prompt_eval_count ?? 0) + (body.eval_count ?? 0);
  return { text: body.response, tokensUsed };
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) { controller.abort(); break; }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

/**
 * LocalPort wraps any Ollama-compatible /api/generate endpoint as a VerifierLLM.
 * JSON format mode is requested so responses are always valid JSON objects.
 */
export class LocalPort implements VerifierLLM {
  readonly name: string;
  private readonly config: LocalPortConfig;

  constructor(config: LocalPortConfig) {
    this.config = config;
    this.name = config.providerName ?? "local";
  }

  async extractClaims(
    documentText: string,
    options: ExtractClaimsOptions = {},
  ): Promise<Result<ExtractionResult, AppError>> {
    const model = options.modelId ?? this.config.defaultModel;
    const maxClaims = options.maxClaims ?? 10;
    const prompt = `Extract factual claims from the following text. Return ONLY valid JSON in this format: {"claims":[{"text":string,"startOffset":number|null,"endOffset":number|null,"checkworthiness":number}]}. Extract at most ${maxClaims} claims.\n\nText:\n${documentText}`;

    try {
      const { text, tokensUsed } = await ollamaGenerate(this.config, model, prompt, options.signal);

      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch {
        return err(new LLMParseError("Invalid JSON from local extraction", text));
      }

      const validated = ExtractionSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Local extraction schema mismatch", text));
      }

      const claims: ReadonlyArray<ExtractedClaim> = validated.data.claims.map((c) => ({
        text: c.text,
        startOffset: c.startOffset ?? null,
        endOffset: c.endOffset ?? null,
        checkworthiness: clampScore(c.checkworthiness),
      }));

      return ok({ claims, tokensUsed, modelId: model });
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
    const prompt = `Research the following claim using your knowledge. Return ONLY valid JSON: {"evidence":[{"url":string,"title":string,"snippet":string,"publishedAt":string|null,"stance":"supports"|"refutes"|"neutral","relevanceScore":number}],"searchQueriesIssued":number}. Issue at most ${maxQueries} conceptual queries.\n\nClaim: ${claimText}`;

    try {
      const { text, tokensUsed } = await ollamaGenerate(this.config, model, prompt, options.signal);

      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch {
        return err(new LLMParseError("Invalid JSON from local research", text));
      }

      const validated = ResearchSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Local research schema mismatch", text));
      }

      return ok({
        claimText,
        evidence: validated.data.evidence.map(toEvidenceItem),
        tokensUsed,
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
      ? `\nEvidence:\n${prior.evidence.map((e) => `- [${e.stance}] ${e.title}: ${e.snippet}`).join("\n")}`
      : "";

    const prompt = `Adjudicate the following factual claim. Return ONLY valid JSON: {"verdict":"SUPPORTED"|"REFUTED"|"UNVERIFIABLE"|"DISPUTED","confidence":number,"explanation":string,"supportingEvidence":[...],"contradictingEvidence":[...]}. Each evidence: {url,title,snippet,publishedAt,stance,relevanceScore}.\n\nClaim: ${claimText}${context}`;

    try {
      const { text, tokensUsed } = await ollamaGenerate(this.config, model, prompt, options.signal);

      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch {
        return err(new LLMParseError("Invalid JSON from local adjudication", text));
      }

      const validated = AdjudicationSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Local adjudication schema mismatch", text));
      }

      const d = validated.data;

      // Local models occasionally refuse via empty verdict
      if (!d.verdict) {
        return err(new LLMRefusalError("Local model returned empty verdict", this.name));
      }

      return ok({
        claimText,
        verdict: d.verdict as Verdict,
        confidence: asScore(clampScore(d.confidence)),
        explanation: d.explanation,
        supportingEvidence: d.supportingEvidence.map(toEvidenceItem),
        contradictingEvidence: d.contradictingEvidence.map(toEvidenceItem),
        tokensUsed: tokensUsed + (prior?.tokensUsed ?? 0),
        modelId: model,
      });
    } catch (cause) {
      if (cause instanceof AppError) return err(cause);
      return err(new LLMUnavailableError(String(cause), this.name, cause));
    }
  }
}
