// PDF extractor port: extracts plain text from PDF buffers via an in-memory mock.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Extractor, ExtractedContent } from "../extractor.js";

/** Port interface for a PDF parsing backend. */
export interface PdfParserPort {
  parse(buffer: Uint8Array): Promise<{ text: string; pageCount: number }>;
}

/** In-memory mock implementation of PdfParserPort for testing/dev. */
export class MockPdfParser implements PdfParserPort {
  async parse(buffer: Uint8Array): Promise<{ text: string; pageCount: number }> {
    // Simulate minimal PDF text extraction from raw bytes
    const raw = Buffer.from(buffer).toString("latin1");
    const textMatches = raw.match(/BT\s+(.*?)\s+ET/gs) ?? [];
    const text = textMatches
      .flatMap((block) => block.match(/\(([^)]*)\)\s*Tj/g) ?? [])
      .map((m) => m.replace(/^\(/, "").replace(/\)\s*Tj$/, ""))
      .join(" ")
      .trim();
    const pages = (raw.match(/\/Page\b/g) ?? []).length || 1;
    return { text: text || "(mock pdf content)", pageCount: pages };
  }
}

export class PdfExtractor implements Extractor {
  readonly supportedMimeTypes = ["application/pdf"] as const;

  constructor(private readonly parser: PdfParserPort = new MockPdfParser()) {}

  async extract(input: Uint8Array, mimeType: string): Promise<Result<ExtractedContent>> {
    if (mimeType !== "application/pdf") {
      return err(new Error(`PdfExtractor: unsupported mimeType "${mimeType}"`));
    }
    try {
      const { text, pageCount } = await this.parser.parse(input);
      return ok({
        text,
        mimeType,
        pageCount,
        metadata: { pageCount: String(pageCount) },
      });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
