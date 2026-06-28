// Google Vertex AI port: implements VerifierLLM via the generateContent REST API
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

/** Configuration for Vertex AI access */
export interface VertexPortConfig {
  readonly projectId: string;
  readonly location: string;
  readonly defaultModelId: string;
  /** Service account access token — if omitted, uses GOOGLE_ACCESS_TOKEN env var */
  readonly accessToken?: string;
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

interface VertexContent {
  role: string;
  parts: Array<{ text: string }>;
}

interface VertexRequest {
  systemInstruction?: { parts: Array<{ text: string }> };
  contents: VertexContent[];
  generationConfig?: {
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

interface VertexResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

async function vertexGenerate(
  config: VertexPortConfig,
  modelId: string,
  request: VertexRequest,
  signal?: AbortSignal,
): Promise<VertexResponse> {
  const providerName = config.providerName ?? "vertex";
  const token = config.accessToken ?? process.env["GOOGLE_ACCESS_TOKEN"] ?? "";
  const url =
    `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${modelId}:generateContent`;

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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: combinedSignal,
    });
  } catch (cause) {
    throw new LLMUnavailableError(`Network error calling ${providerName}`, providerName, cause);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "5") * 1000;
    throw new LLMRateLimitError(`Rate limited by ${providerName}`, retryAfter);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new LLMUnavailableError(
      `${providerName} HTTP ${res.status}: ${text.slice(0, 200)}`,
      providerName,
    );
  }

  return res.json() as Promise<VertexResponse>;
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) { controller.abort(); break; }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

function extractText(resp: VertexResponse): string {
  return resp.candidates[0]?.content.parts.map((p) => p.text).join("") ?? "";
}

function tokenCount(resp: VertexResponse): number {
  const u = resp.usageMetadata;
  return (u?.promptTokenCount ?? 0) + (u?.candidatesTokenCount ?? 0);
}

/**
 * VertexPort wraps the Google Vertex AI generateContent REST API as a VerifierLLM.
 * No Google Cloud SDK dependency — uses fetch with a bearer token.
 */
export class VertexPort implements VerifierLLM {
  readonly name: string;
  private readonly config: VertexPortConfig;

  constructor(config: VertexPortConfig) {
    this.config = config;
    this.name = config.providerName ?? "vertex";
  }

  async extractClaims(
    documentText: string,
    options: ExtractClaimsOptions = {},
  ): Promise<Result<ExtractionResult, AppError>> {
    const modelId = options.modelId ?? this.config.defaultModelId;
    const maxClaims = options.maxClaims ?? 10;

    try {
      const resp = await vertexGenerate(
        this.config,
        modelId,
        {
          systemInstruction: {
            parts: [{ text: `Extract factual claims as JSON: {"claims":[{"text":string,"startOffset":number|null,"endOffset":number|null,"checkworthiness":number}]}. Max ${maxClaims} claims.` }],
          },
          contents: [{ role: "user", parts: [{ text: documentText }] }],
          generationConfig: {
            maxOutputTokens: options.maxOutputTokens ?? 2048,
            responseMimeType: "application/json",
          },
        },
        options.signal,
      );

      const content = extractText(resp);
      let parsed: unknown;
      try { parsed = JSON.parse(content); } catch {
        return err(new LLMParseError("Invalid JSON from Vertex extraction", content));
      }

      const validated = ExtractionSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Vertex extraction schema mismatch", content));
      }

      const claims: ReadonlyArray<ExtractedClaim> = validated.data.claims.map((c) => ({
        text: c.text,
        startOffset: c.startOffset ?? null,
        endOffset: c.endOffset ?? null,
        checkworthiness: clampScore(c.checkworthiness),
      }));

      return ok({ claims, tokensUsed: tokenCount(resp), modelId });
    } catch (cause) {
      if (cause instanceof AppError) return err(cause);
      return err(new LLMUnavailableError(String(cause), this.name, cause));
    }
  }

  async research(
    claimText: string,
    options: ResearchOptions = {},
  ): Promise<Result<ResearchResult, AppError>> {
    const modelId = options.modelId ?? this.config.defaultModelId;
    const maxQueries = options.maxSearchQueries ?? 3;

    try {
      const resp = await vertexGenerate(
        this.config,
        modelId,
        {
          systemInstruction: {
            parts: [{ text: `Research a factual claim. Return JSON: {"evidence":[{"url":string,"title":string,"snippet":string,"publishedAt":string|null,"stance":"supports"|"refutes"|"neutral","relevanceScore":number}],"searchQueriesIssued":number}. Max ${maxQueries} queries.` }],
          },
          contents: [{ role: "user", parts: [{ text: `Research: ${claimText}` }] }],
          generationConfig: {
            maxOutputTokens: options.maxOutputTokens ?? 2048,
            responseMimeType: "application/json",
          },
        },
        options.signal,
      );

      const content = extractText(resp);
      let parsed: unknown;
      try { parsed = JSON.parse(content); } catch {
        return err(new LLMParseError("Invalid JSON from Vertex research", content));
      }

      const validated = ResearchSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Vertex research schema mismatch", content));
      }

      return ok({
        claimText,
        evidence: validated.data.evidence.map(toEvidenceItem),
        tokensUsed: tokenCount(resp),
        modelId,
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
    const modelId = options.modelId ?? this.config.defaultModelId;
    const prior = options.researchResult;
    const context = prior
      ? `\nEvidence:\n${prior.evidence.map((e) => `- [${e.stance}] ${e.title}: ${e.snippet}`).join("\n")}`
      : "";

    try {
      const resp = await vertexGenerate(
        this.config,
        modelId,
        {
          systemInstruction: {
            parts: [{ text: `Adjudicate a factual claim. Return JSON: {"verdict":"SUPPORTED"|"REFUTED"|"UNVERIFIABLE"|"DISPUTED","confidence":number,"explanation":string,"supportingEvidence":[...],"contradictingEvidence":[...]}. Each evidence: {url,title,snippet,publishedAt,stance,relevanceScore}.` }],
          },
          contents: [{ role: "user", parts: [{ text: `Adjudicate: ${claimText}${context}` }] }],
          generationConfig: {
            maxOutputTokens: options.maxOutputTokens ?? 2048,
            responseMimeType: "application/json",
          },
        },
        options.signal,
      );

      const finishReason = resp.candidates[0]?.finishReason;
      if (finishReason === "SAFETY") {
        return err(new LLMRefusalError("Vertex safety filter triggered", this.name));
      }

      const content = extractText(resp);
      let parsed: unknown;
      try { parsed = JSON.parse(content); } catch {
        return err(new LLMParseError("Invalid JSON from Vertex adjudication", content));
      }

      const validated = AdjudicationSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Vertex adjudication schema mismatch", content));
      }

      const d = validated.data;
      return ok({
        claimText,
        verdict: d.verdict as Verdict,
        confidence: asScore(clampScore(d.confidence)),
        explanation: d.explanation,
        supportingEvidence: d.supportingEvidence.map(toEvidenceItem),
        contradictingEvidence: d.contradictingEvidence.map(toEvidenceItem),
        tokensUsed: tokenCount(resp) + (prior?.tokensUsed ?? 0),
        modelId,
      });
    } catch (cause) {
      if (cause instanceof AppError) return err(cause);
      return err(new LLMUnavailableError(String(cause), this.name, cause));
    }
  }
}
