// Ingestion pipeline: orchestrates fetch → extract → normalize → hash for a SourceRef.

import { ok, err, isOk, isErr, newId, contentHash, epochToIso } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Extractor } from "./extractor.js";
import type { SourceRef } from "./source-ref.js";
import { makeDocument } from "./document.js";
import type { IngestedDocument } from "./document.js";
import { normalizeText } from "./normalizer.js";
import { TextExtractor } from "./extractors/text-extractor.js";
import { HtmlExtractor } from "./extractors/html-extractor.js";

export interface FetcherPort {
  fetch(url: string, headers?: Record<string, string>): Promise<{ buffer: Uint8Array; mimeType: string }>;
}

export class MockFetcher implements FetcherPort {
  async fetch(url: string, _headers?: Record<string, string>): Promise<{ buffer: Uint8Array; mimeType: string }> {
    const body = `Mock content fetched from ${url}`;
    return { buffer: new TextEncoder().encode(body), mimeType: "text/plain" };
  }
}

export interface LanguageDetectorPort {
  detect(text: string): Promise<string | null>;
}

export class MockLanguageDetector implements LanguageDetectorPort {
  async detect(_text: string): Promise<string | null> {
    return "en";
  }
}

export interface PipelineConfig {
  readonly fetcher?: FetcherPort;
  readonly languageDetector?: LanguageDetectorPort;
  readonly extraExtractors?: readonly Extractor[];
}

function resolveExtractor(
  mimeType: string,
  extractors: readonly Extractor[]
): Extractor | undefined {
  const base = mimeType.toLowerCase().split(";")[0]!.trim();
  return extractors.find((e) => e.supportedMimeTypes.includes(base));
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export class IngestionPipeline {
  private readonly fetcher: FetcherPort;
  private readonly languageDetector: LanguageDetectorPort;
  private readonly extractors: readonly Extractor[];

  constructor(config: PipelineConfig = {}) {
    this.fetcher = config.fetcher ?? new MockFetcher();
    this.languageDetector = config.languageDetector ?? new MockLanguageDetector();
    this.extractors = [
      new TextExtractor(),
      new HtmlExtractor(),
      ...(config.extraExtractors ?? []),
    ];
  }

  async ingest(sourceRef: SourceRef): Promise<Result<IngestedDocument>> {
    // 1. Fetch raw content.
    let buffer: Uint8Array;
    let mimeType: string;

    try {
      const fetched = await this.fetcher.fetch(sourceRef.url, sourceRef.headers);
      buffer = fetched.buffer;
      mimeType = sourceRef.mimeType ?? fetched.mimeType;
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }

    // 2. Resolve extractor.
    const extractor = resolveExtractor(mimeType, this.extractors);
    if (extractor === undefined) {
      return err(new Error(`No extractor registered for mimeType "${mimeType}"`));
    }

    // 3. Extract text.
    const extractResult = await extractor.extract(buffer, mimeType);
    if (isErr(extractResult)) {
      return extractResult;
    }
    const extracted = extractResult.value;

    // 4. Normalize.
    const textContent = normalizeText(extracted.text);

    // 5. Language detection.
    const language = await this.languageDetector.detect(textContent).catch(() => null);

    // 6. Hash.
    const rawContent = new TextDecoder("utf-8").decode(buffer);
    const hash = contentHash(rawContent);

    // 7. Assemble document.
    const doc = makeDocument({
      id: newId("doc"),
      sourceRef,
      mimeType,
      rawContent,
      textContent,
      language,
      contentHash: hash,
      wordCount: countWords(textContent),
      charCount: textContent.length,
      extractedAt: epochToIso(Date.now()),
      metadata: Object.keys(extracted.metadata).length > 0 ? extracted.metadata : undefined,
    });

    return ok(doc);
  }
}
