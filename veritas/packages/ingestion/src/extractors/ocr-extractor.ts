// OCR extractor port: extracts text from images via a pluggable OCR backend.

import { ok, err } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { Extractor, ExtractedContent } from "../extractor.js";

const SUPPORTED = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff",
  "image/webp",
  "image/bmp",
] as const;

export type OcrMimeType = (typeof SUPPORTED)[number];

/** Port interface for an OCR engine. */
export interface OcrEnginePort {
  recognize(buffer: Uint8Array, mimeType: string): Promise<{ text: string; confidence: number }>;
}

/** In-memory mock OCR engine for dev/test environments. */
export class MockOcrEngine implements OcrEnginePort {
  async recognize(
    _buffer: Uint8Array,
    mimeType: string,
  ): Promise<{ text: string; confidence: number }> {
    return { text: `(mock ocr result for ${mimeType})`, confidence: 0.85 };
  }
}

export class OcrExtractor implements Extractor {
  readonly supportedMimeTypes: readonly string[] = SUPPORTED;

  constructor(private readonly engine: OcrEnginePort = new MockOcrEngine()) {}

  async extract(input: Uint8Array, mimeType: string): Promise<Result<ExtractedContent>> {
    if (!(SUPPORTED as readonly string[]).includes(mimeType)) {
      return err(new Error(`OcrExtractor: unsupported mimeType "${mimeType}"`));
    }
    try {
      const { text, confidence } = await this.engine.recognize(input, mimeType);
      return ok({
        text,
        mimeType,
        metadata: { ocrConfidence: String(confidence) },
      });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
