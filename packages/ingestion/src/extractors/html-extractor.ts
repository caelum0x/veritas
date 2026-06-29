// HTML-to-text extractor: strips tags and normalizes whitespace from HTML content.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Extractor, ExtractedContent } from "../extractor.js";

const BLOCK_TAGS = new Set([
  "p", "div", "br", "li", "tr", "td", "th", "h1", "h2", "h3",
  "h4", "h5", "h6", "blockquote", "pre", "article", "section",
  "header", "footer", "nav", "main", "aside",
]);

const SKIP_TAGS = new Set([
  "script", "style", "noscript", "head", "meta", "link",
  "svg", "canvas", "iframe", "object", "embed",
]);

function htmlToText(html: string): string {
  // Remove skip-tag blocks with their content.
  let result = html.replace(
    /<(script|style|noscript|head|svg|canvas|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi,
    " "
  );

  // Replace block-level tags with newlines.
  result = result.replace(/<\/?(p|div|br|li|tr|td|th|h[1-6]|blockquote|pre|article|section|header|footer|nav|main|aside)[^>]*>/gi, "\n");

  // Strip remaining HTML tags.
  result = result.replace(/<[^>]+>/g, "");

  // Decode common HTML entities.
  result = result
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)));

  // Collapse whitespace and blank lines.
  result = result
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return result.trim();
}

function extractTitle(html: string): string | undefined {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? match[1]!.trim() : undefined;
}

function extractMetaDescription(html: string): string | undefined {
  const match = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i.exec(html);
  return match ? match[1]!.trim() : undefined;
}

export class HtmlExtractor implements Extractor {
  readonly supportedMimeTypes: readonly string[] = [
    "text/html",
    "application/xhtml+xml",
  ];

  async extract(input: Uint8Array, mimeType: string): Promise<Result<ExtractedContent>> {
    const html = new TextDecoder("utf-8").decode(input);

    if (html.trim().length === 0) {
      return err(new Error("Empty HTML content"));
    }

    const text = htmlToText(html);

    if (text.length === 0) {
      return err(new Error("No extractable text found in HTML"));
    }

    const title = extractTitle(html);
    const description = extractMetaDescription(html);

    const metadata: Record<string, string> = {};
    if (title !== undefined) metadata["title"] = title;
    if (description !== undefined) metadata["description"] = description;

    return ok({ text, mimeType, metadata });
  }
}
