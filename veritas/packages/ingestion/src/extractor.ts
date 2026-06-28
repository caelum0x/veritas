// Extractor port: defines the interface all document extractors must implement.

import type { Result } from "@veritas/core";

export interface ExtractedContent {
  readonly text: string;
  readonly mimeType: string;
  readonly pageCount?: number;
  readonly metadata: Record<string, string>;
}

export interface Extractor {
  readonly supportedMimeTypes: readonly string[];
  extract(input: Uint8Array, mimeType: string): Promise<Result<ExtractedContent>>;
}

export interface ExtractorRegistry {
  register(extractor: Extractor): void;
  resolve(mimeType: string): Extractor | undefined;
}
