// Phase 1: web-search research call for claim investigation
import type Anthropic from "@anthropic-ai/sdk";
import type { ResearchResult, EvidenceItem } from "../types.js";
import type { ResearchOptions } from "../provider.js";
import type { AppError } from "@veritas/core";
import { err, ok, asScore } from "@veritas/core";
import type { Result } from "@veritas/core";
import { LLMParseError, LLMUnavailableError } from "../errors.js";
import { createMessage } from "./message.js";
import { extractText, extractCitations } from "./text.js";
import { buildResearchPrompt } from "../prompts/research.js";
import { RESEARCH_CONFIG } from "./model.js";

const DEFAULT_MAX_SEARCH_QUERIES = 5;

/** Classify evidence stance from surrounding context */
function classifyStance(
  snippet: string,
  claimText: string,
): "supports" | "refutes" | "neutral" {
  const lowerSnippet = snippet.toLowerCase();
  const lowerClaim = claimText.toLowerCase().slice(0, 60);

  const supportsTerms = ["confirms", "verified", "true", "correct", "indeed", "yes"];
  const refutesTerms = ["false", "incorrect", "debunked", "misleading", "wrong", "untrue", "myth"];

  const hasSupport = supportsTerms.some((t) => lowerSnippet.includes(t));
  const hasRefute = refutesTerms.some((t) => lowerSnippet.includes(t));

  if (hasRefute && !hasSupport) return "refutes";
  if (hasSupport && !hasRefute) return "supports";

  // If the claim text appears closely in the snippet, treat as loosely supporting
  const claimWords = lowerClaim.split(" ").filter((w) => w.length > 4);
  const matchCount = claimWords.filter((w) => lowerSnippet.includes(w)).length;
  if (matchCount >= 2) return "supports";

  return "neutral";
}

/** Convert raw citations to EvidenceItem with stance classification */
function buildEvidenceItems(
  citations: Array<{
    url: string;
    title: string;
    snippet: string;
    publishedAt: string | null;
  }>,
  claimText: string,
): EvidenceItem[] {
  return citations.map((c, idx) => ({
    url: c.url,
    title: c.title,
    snippet: c.snippet,
    publishedAt: c.publishedAt,
    stance: classifyStance(c.snippet, claimText),
    relevanceScore: asScore(Math.max(0.1, 1.0 - idx * 0.1)),
  }));
}

/**
 * Executes phase-1 research for a single claim using Claude with web_search.
 * Returns a ResearchResult with evidence gathered from web searches.
 */
export async function runResearch(
  client: Anthropic,
  claimText: string,
  systemPrompt: string,
  options: ResearchOptions = {},
): Promise<Result<ResearchResult, AppError>> {
  const maxSearchQueries =
    options.maxSearchQueries ?? DEFAULT_MAX_SEARCH_QUERIES;
  const modelId = options.modelId ?? RESEARCH_CONFIG.model;
  const maxOutputTokens =
    options.maxOutputTokens ?? RESEARCH_CONFIG.maxTokens;

  const webSearchTool: Anthropic.Tool = {
    type: "web_search_20260209" as unknown as "custom",
    name: "web_search",
    description: "Search the web for evidence about a claim",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query string",
        },
      },
      required: ["query"],
    },
    ...(maxSearchQueries > 0
      ? { max_uses: maxSearchQueries } as Record<string, unknown>
      : {}),
  } as unknown as Anthropic.Tool;

  const userMessage = buildResearchPrompt(claimText);

  const result = await createMessage({
    client,
    model: modelId,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    tools: [webSearchTool],
    maxTokens: maxOutputTokens,
    thinking: { type: "adaptive" },
    signal: options.signal,
  });

  if (!result.ok) return err(result.error);

  const { message, totalInputTokens, totalOutputTokens } = result.value;

  if (message.stop_reason === "refusal") {
    return err(
      new LLMParseError(
        "Model refused to perform research",
        extractText(message.content),
      ),
    );
  }

  const rawCitations = extractCitations(message.content);
  const evidence = buildEvidenceItems(rawCitations, claimText);

  if (evidence.length === 0 && message.stop_reason !== "end_turn") {
    return err(
      new LLMUnavailableError(
        `Research produced no evidence (stop_reason=${message.stop_reason})`,
        "anthropic",
      ),
    );
  }

  return ok({
    claimText,
    evidence,
    tokensUsed: totalInputTokens + totalOutputTokens,
    modelId,
    searchQueriesIssued: rawCitations.length,
  });
}
