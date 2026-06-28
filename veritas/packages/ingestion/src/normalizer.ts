// Normalizer: clean and standardize extracted text before downstream processing.

import { normalizeWhitespace } from "@veritas/core";

export interface NormalizerOptions {
  readonly lowercase?: boolean;
  readonly removeControlChars?: boolean;
  readonly collapseWhitespace?: boolean;
  readonly trimLines?: boolean;
  readonly maxLength?: number;
}

const DEFAULT_OPTIONS: Required<NormalizerOptions> = {
  lowercase: false,
  removeControlChars: true,
  collapseWhitespace: true,
  trimLines: true,
  maxLength: 0, // 0 = no limit
};

export function normalizeText(
  text: string,
  options?: NormalizerOptions,
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let result = text;

  if (opts.removeControlChars) {
    // Remove control chars except newlines and tabs
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  }

  if (opts.trimLines) {
    result = result
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
  }

  if (opts.collapseWhitespace) {
    result = normalizeWhitespace(result);
  }

  if (opts.lowercase) {
    result = result.toLowerCase();
  }

  if (opts.maxLength > 0 && result.length > opts.maxLength) {
    result = result.slice(0, opts.maxLength);
  }

  return result.trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

export function countChars(text: string): number {
  return text.length;
}
