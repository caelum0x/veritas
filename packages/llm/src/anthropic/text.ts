// Extract text content and citations from Anthropic message content blocks
import type Anthropic from "@anthropic-ai/sdk";
import type { EvidenceItem } from "../types.js";
import type { Score } from "@veritas/core";
import { asScore } from "@veritas/core";

/** Extract all plain text from a message's content blocks */
export function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Raw URL citation scraped from web_search tool results */
interface RawCitation {
  readonly url: string;
  readonly title: string;
  readonly snippet: string;
  readonly publishedAt: string | null;
}

/** Extract citations from web_search tool result blocks */
export function extractCitations(
  content: Anthropic.ContentBlock[],
): RawCitation[] {
  const citations: RawCitation[] = [];

  for (const block of content) {
    if ((block as { type: string }).type !== "tool_result") continue;
    const toolResult = block as unknown as {
      type: "tool_result";
      content: unknown[];
    };
    if (!Array.isArray(toolResult.content)) continue;

    for (const item of toolResult.content) {
      if (
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        (item as { type: string }).type === "web_search_result"
      ) {
        const result = item as {
          url?: string;
          title?: string;
          snippet?: string;
          published_date?: string;
        };
        citations.push({
          url: result.url ?? "",
          title: result.title ?? "",
          snippet: result.snippet ?? "",
          publishedAt: result.published_date ?? null,
        });
      }
    }
  }

  return citations;
}

/** Convert raw citations to EvidenceItem with a neutral stance and base relevance */
export function citationsToEvidence(
  citations: RawCitation[],
  relevance: Score = asScore(0.5),
): EvidenceItem[] {
  return citations.map((c) => ({
    url: c.url,
    title: c.title,
    snippet: c.snippet,
    publishedAt: c.publishedAt,
    stance: "neutral" as const,
    relevanceScore: relevance,
  }));
}
