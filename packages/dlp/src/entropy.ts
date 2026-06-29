// Shannon entropy calculation for detecting high-entropy secrets (API keys, tokens, etc.)
export interface EntropyResult {
  readonly value: number;
  readonly isHighEntropy: boolean;
  readonly length: number;
}

/** Compute Shannon entropy (bits per character) for a string */
export function shannonEntropy(input: string): number {
  if (input.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of input) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  const len = input.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const HIGH_ENTROPY_THRESHOLD = 3.5;
const MIN_SECRET_LENGTH = 16;

/** Check if a token looks like a high-entropy secret */
export function analyzeEntropy(
  token: string,
  threshold = HIGH_ENTROPY_THRESHOLD,
  minLength = MIN_SECRET_LENGTH,
): EntropyResult {
  const value = shannonEntropy(token);
  const isHighEntropy = token.length >= minLength && value >= threshold;
  return { value, isHighEntropy, length: token.length };
}

const SECRET_PREFIXES = [
  "sk_",
  "pk_",
  "rk_",
  "api_",
  "key_",
  "tok_",
  "secret_",
  "token_",
  "access_",
  "auth_",
  "bearer_",
  "ghp_",
  "ghs_",
  "gho_",
  "AKIA",
];

/** Returns true if the token matches a known secret prefix pattern */
export function hasSecretPrefix(token: string): boolean {
  const lower = token.toLowerCase();
  return SECRET_PREFIXES.some((p) => lower.startsWith(p.toLowerCase()));
}

/** Combined heuristic: high entropy OR known prefix with sufficient length */
export function looksLikeSecret(
  token: string,
  threshold = HIGH_ENTROPY_THRESHOLD,
  minLength = MIN_SECRET_LENGTH,
): boolean {
  if (token.length < minLength) return false;
  const { isHighEntropy } = analyzeEntropy(token, threshold, minLength);
  return isHighEntropy || hasSecretPrefix(token);
}
