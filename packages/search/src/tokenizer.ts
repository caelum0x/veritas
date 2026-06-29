// Tokenizer — converts raw text into normalized search tokens
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "by", "do",
  "for", "from", "has", "have", "he", "her", "him", "his", "how",
  "i", "if", "in", "is", "it", "its", "me", "my", "not", "of",
  "on", "or", "our", "out", "she", "so", "some", "than", "that",
  "the", "their", "them", "then", "there", "they", "this", "to",
  "up", "us", "was", "we", "were", "what", "when", "who", "will",
  "with", "you", "your",
]);

export interface TokenizerOptions {
  readonly stopWords?: ReadonlySet<string>;
  readonly minLength?: number;
  readonly stem?: boolean;
}

const DEFAULT_OPTIONS: Required<TokenizerOptions> = {
  stopWords: STOP_WORDS,
  minLength: 2,
  stem: false,
};

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function simpleStem(word: string): string {
  // Light Porter-inspired suffix stripping (no external dependency)
  if (word.length <= 3) return word;
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("tion") && word.length > 6) return word.slice(0, -4);
  if (word.endsWith("ness") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("ment") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("ly") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string, options: TokenizerOptions = {}): readonly string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const raw = text.split(/[\s\-_.,;:!?'"()\[\]{}<>/\\|@#$%^&*+=`~]+/);
  const tokens: string[] = [];
  for (const raw_token of raw) {
    const normalized = normalizeToken(raw_token);
    if (normalized.length < opts.minLength) continue;
    if (opts.stopWords.has(normalized)) continue;
    const stemmed = opts.stem ? simpleStem(normalized) : normalized;
    if (stemmed.length >= opts.minLength) {
      tokens.push(stemmed);
    }
  }
  return tokens;
}

export function tokenizeField(value: unknown, options?: TokenizerOptions): readonly string[] {
  if (typeof value === "string") return tokenize(value, options);
  if (typeof value === "number" || typeof value === "boolean") {
    return tokenize(String(value), options);
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => tokenizeField(v, options));
  }
  return [];
}
