// Text analyzer — combines tokenization and optional stemming into a single pipeline
import { tokenize, type TokenizerOptions } from "./tokenizer.js";

export interface AnalyzerOptions {
  readonly stem?: boolean;
  readonly minLength?: number;
  readonly extraStopWords?: readonly string[];
}

const BASE_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "by", "do",
  "for", "from", "has", "have", "he", "her", "him", "his", "how",
  "i", "if", "in", "is", "it", "its", "me", "my", "not", "of",
  "on", "or", "our", "out", "she", "so", "some", "than", "that",
  "the", "their", "them", "then", "there", "they", "this", "to",
  "up", "us", "was", "we", "were", "what", "when", "who", "will",
  "with", "you", "your",
]);

function buildStopWords(extra?: readonly string[]): ReadonlySet<string> {
  if (!extra || extra.length === 0) return BASE_STOP_WORDS;
  return new Set([...BASE_STOP_WORDS, ...extra]);
}

export function analyze(text: string, options: AnalyzerOptions = {}): readonly string[] {
  const tokenizerOptions: TokenizerOptions = {
    stem: options.stem ?? false,
    minLength: options.minLength ?? 2,
    stopWords: buildStopWords(options.extraStopWords),
  };
  return tokenize(text, tokenizerOptions);
}

export function analyzeField(value: unknown, options: AnalyzerOptions = {}): readonly string[] {
  if (typeof value === "string") return analyze(value, options);
  if (typeof value === "number" || typeof value === "boolean") {
    return analyze(String(value), options);
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => analyzeField(v, options));
  }
  return [];
}

export function buildTermFrequencies(tokens: readonly string[]): Map<string, number> {
  const freqs = new Map<string, number>();
  for (const token of tokens) {
    freqs.set(token, (freqs.get(token) ?? 0) + 1);
  }
  return freqs;
}
