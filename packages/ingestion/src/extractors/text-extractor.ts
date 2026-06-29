// Plain-text extractor: passthrough for text/plain MIME type content.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Extractor, ExtractedContent } from "../extractor.js";

export class TextExtractor implements Extractor {
  readonly supportedMimeTypes: readonly string[] = [
    "text/plain",
    "text/markdown",
    "text/csv",
  ];

  async extract(input: Uint8Array, mimeType: string): Promise<Result<ExtractedContent>> {
    const text = new TextDecoder("utf-8").decode(input).trim();

    if (text.length === 0) {
      return err(new Error("Empty text content"));
    }

    return ok({
      text,
      mimeType,
      metadata: {},
    });
  }
}
