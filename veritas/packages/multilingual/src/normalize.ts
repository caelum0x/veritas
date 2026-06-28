// Unicode normalization utilities for multilingual text processing

export type NormalizationForm = "NFC" | "NFD" | "NFKC" | "NFKD";

export interface NormalizeOptions {
  readonly form?: NormalizationForm;
  readonly trimWhitespace?: boolean;
  readonly collapseWhitespace?: boolean;
  readonly removeDiacritics?: boolean;
  readonly lowercase?: boolean;
}

const DEFAULT_OPTIONS: NormalizeOptions = {
  form: "NFC",
  trimWhitespace: true,
  collapseWhitespace: false,
  removeDiacritics: false,
  lowercase: false,
};

/** Normalize unicode text with configurable options */
export function normalizeText(text: string, options: NormalizeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = text;

  if (opts.form) {
    result = result.normalize(opts.form);
  }

  if (opts.removeDiacritics) {
    result = result.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  if (opts.lowercase) {
    result = result.toLowerCase();
  }

  if (opts.collapseWhitespace) {
    result = result.replace(/\s+/g, " ");
  }

  if (opts.trimWhitespace) {
    result = result.trim();
  }

  return result;
}

/** Normalize text to NFC form (canonical composition — preferred for storage) */
export function toNFC(text: string): string {
  return text.normalize("NFC");
}

/** Normalize text to NFD form (canonical decomposition) */
export function toNFD(text: string): string {
  return text.normalize("NFD");
}

/** Normalize text to NFKC form (compatibility composition) */
export function toNFKC(text: string): string {
  return text.normalize("NFKC");
}

/** Remove diacritical marks from text */
export function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Normalize for comparison: NFC + lowercase + trim */
export function normalizeForComparison(text: string): string {
  return normalizeText(text, {
    form: "NFC",
    trimWhitespace: true,
    collapseWhitespace: true,
    lowercase: true,
  });
}

/** Check if two strings are equivalent after normalization */
export function areEquivalent(a: string, b: string, options?: NormalizeOptions): boolean {
  return normalizeText(a, options) === normalizeText(b, options);
}

/** Remove zero-width and invisible characters */
export function removeInvisibleChars(text: string): string {
  return text.replace(/[​-‍﻿­⁠]/g, "");
}

/** Normalize line endings to LF */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
