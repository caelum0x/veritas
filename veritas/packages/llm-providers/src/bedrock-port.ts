// AWS Bedrock port: implements VerifierLLM via Bedrock's converse API (port/mock interface)
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

/** Configuration for AWS Bedrock access */
export interface BedrockPortConfig {
  readonly region: string;
  readonly defaultModelId: string;
  /** AWS credentials — pulled from environment if omitted */
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly sessionToken?: string;
  readonly providerName?: string;
}

/** Minimal Bedrock converse request/response shapes (no SDK dep) */
interface BedrockConverseRequest {
  modelId: string;
  messages: Array<{ role: string; content: Array<{ text: string }> }>;
  system?: Array<{ text: string }>;
  inferenceConfig?: { maxTokens?: number };
}

interface BedrockConverseResponse {
  output: {
    message: {
      content: Array<{ text: string }>;
    };
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason?: string;
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
  return {
    ...raw,
    relevanceScore: asScore(clampScore(raw.relevanceScore)),
  };
}

/** Signs a Bedrock request with AWS Signature V4 (minimal, SHA-256 only) */
async function signedBedrockHeaders(
  method: string,
  url: URL,
  body: string,
  config: BedrockPortConfig,
): Promise<Record<string, string>> {
  const accessKeyId =
    config.accessKeyId ?? process.env["AWS_ACCESS_KEY_ID"] ?? "";
  const secretAccessKey =
    config.secretAccessKey ?? process.env["AWS_SECRET_ACCESS_KEY"] ?? "";
  const sessionToken =
    config.sessionToken ?? process.env["AWS_SESSION_TOKEN"];

  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const dateOnly = dateStr.slice(0, 8);
  const service = "bedrock";
  const region = config.region;

  const encoder = new TextEncoder();

  async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
    const k = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return crypto.subtle.sign("HMAC", k, encoder.encode(data));
  }

  async function sha256Hex(data: string): Promise<string> {
    const buf = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  const payloadHash = await sha256Hex(body);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host: url.host,
    "x-amz-date": dateStr,
    "x-amz-content-sha256": payloadHash,
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;

  const signedHeaderNames = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("\n") + "\n";

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.slice(1),
    canonicalHeaders,
    signedHeaderNames,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateOnly}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    dateStr,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmacSha256(encoder.encode(`AWS4${secretAccessKey}`), dateOnly);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signatureRaw = await hmacSha256(kSigning, stringToSign);
  const signature = Array.from(new Uint8Array(signatureRaw))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  headers["authorization"] =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`;

  return headers;
}

async function bedrockConverse(
  config: BedrockPortConfig,
  request: BedrockConverseRequest,
  signal?: AbortSignal,
): Promise<BedrockConverseResponse> {
  const providerName = config.providerName ?? "bedrock";
  const url = new URL(
    `https://bedrock-runtime.${config.region}.amazonaws.com/model/${request.modelId}/converse`,
  );
  const body = JSON.stringify(request);
  const headers = await signedBedrockHeaders("POST", url, body, config);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body,
      signal,
    });
  } catch (cause) {
    throw new LLMUnavailableError(`Network error calling ${providerName}`, providerName, cause);
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

  return res.json() as Promise<BedrockConverseResponse>;
}

function extractText(response: BedrockConverseResponse): string {
  return response.output.message.content.map((c) => c.text).join("");
}

/**
 * BedrockPort wraps the AWS Bedrock Converse API as a VerifierLLM.
 * Uses fetch + AWS Signature V4 — no @aws-sdk dep required.
 */
export class BedrockPort implements VerifierLLM {
  readonly name: string;
  private readonly config: BedrockPortConfig;

  constructor(config: BedrockPortConfig) {
    this.config = config;
    this.name = config.providerName ?? "bedrock";
  }

  async extractClaims(
    documentText: string,
    options: ExtractClaimsOptions = {},
  ): Promise<Result<ExtractionResult, AppError>> {
    const modelId = options.modelId ?? this.config.defaultModelId;
    const maxClaims = options.maxClaims ?? 10;
    const systemText = `Extract factual claims as JSON: {"claims":[{"text":string,"startOffset":number|null,"endOffset":number|null,"checkworthiness":number}]}. Max ${maxClaims} claims.`;

    try {
      const resp = await bedrockConverse(
        this.config,
        {
          modelId,
          system: [{ text: systemText }],
          messages: [{ role: "user", content: [{ text: documentText }] }],
          inferenceConfig: { maxTokens: options.maxOutputTokens ?? 2048 },
        },
        options.signal,
      );

      const content = extractText(resp);
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return err(new LLMParseError("Invalid JSON from Bedrock extraction", content));
      }

      const validated = ExtractionSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Bedrock extraction schema mismatch", content));
      }

      const claims: ReadonlyArray<ExtractedClaim> = validated.data.claims.map((c) => ({
        text: c.text,
        startOffset: c.startOffset ?? null,
        endOffset: c.endOffset ?? null,
        checkworthiness: clampScore(c.checkworthiness),
      }));

      return ok({
        claims,
        tokensUsed: resp.usage.inputTokens + resp.usage.outputTokens,
        modelId,
      });
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
    const systemText = `Research a factual claim. Return JSON: {"evidence":[{"url":string,"title":string,"snippet":string,"publishedAt":string|null,"stance":"supports"|"refutes"|"neutral","relevanceScore":number}],"searchQueriesIssued":number}. Max ${maxQueries} queries.`;

    try {
      const resp = await bedrockConverse(
        this.config,
        {
          modelId,
          system: [{ text: systemText }],
          messages: [{ role: "user", content: [{ text: `Research: ${claimText}` }] }],
          inferenceConfig: { maxTokens: options.maxOutputTokens ?? 2048 },
        },
        options.signal,
      );

      const content = extractText(resp);
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return err(new LLMParseError("Invalid JSON from Bedrock research", content));
      }

      const validated = ResearchSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Bedrock research schema mismatch", content));
      }

      return ok({
        claimText,
        evidence: validated.data.evidence.map(toEvidenceItem),
        tokensUsed: resp.usage.inputTokens + resp.usage.outputTokens,
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

    const systemText = `Adjudicate a factual claim. Return JSON: {"verdict":"SUPPORTED"|"REFUTED"|"UNVERIFIABLE"|"DISPUTED","confidence":number,"explanation":string,"supportingEvidence":[...],"contradictingEvidence":[...]}. Each evidence: {url,title,snippet,publishedAt,stance,relevanceScore}.`;

    try {
      const resp = await bedrockConverse(
        this.config,
        {
          modelId,
          system: [{ text: systemText }],
          messages: [{ role: "user", content: [{ text: `Adjudicate: ${claimText}${context}` }] }],
          inferenceConfig: { maxTokens: options.maxOutputTokens ?? 2048 },
        },
        options.signal,
      );

      if (resp.stopReason === "content_filter") {
        return err(new LLMRefusalError("Bedrock content filter triggered", this.name));
      }

      const content = extractText(resp);
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        return err(new LLMParseError("Invalid JSON from Bedrock adjudication", content));
      }

      const validated = AdjudicationSchema.safeParse(parsed);
      if (!validated.success) {
        return err(new LLMParseError("Bedrock adjudication schema mismatch", content));
      }

      const d = validated.data;
      return ok({
        claimText,
        verdict: d.verdict as Verdict,
        confidence: asScore(clampScore(d.confidence)),
        explanation: d.explanation,
        supportingEvidence: d.supportingEvidence.map(toEvidenceItem),
        contradictingEvidence: d.contradictingEvidence.map(toEvidenceItem),
        tokensUsed: resp.usage.inputTokens + resp.usage.outputTokens + (prior?.tokensUsed ?? 0),
        modelId,
      });
    } catch (cause) {
      if (cause instanceof AppError) return err(cause);
      return err(new LLMUnavailableError(String(cause), this.name, cause));
    }
  }
}
