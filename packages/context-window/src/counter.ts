// Token counter port interface and a simple character-based mock implementation.
import { type Result, ok } from "@veritas/core";
import { CounterUnavailableError } from "./errors.js";

/** Port interface — real implementations may call an LLM tokenizer. */
export interface TokenCounter {
  count(text: string): Promise<Result<number, CounterUnavailableError>>;
  countMany(texts: readonly string[]): Promise<Result<number, CounterUnavailableError>>;
}

/**
 * Approximates token count as ceil(chars / 4), matching GPT-style heuristics.
 * Suitable for tests and environments without a real tokenizer.
 */
export const charApproxCounter: TokenCounter = {
  async count(text: string): Promise<Result<number, CounterUnavailableError>> {
    return ok(Math.ceil(text.length / 4));
  },
  async countMany(texts: readonly string[]): Promise<Result<number, CounterUnavailableError>> {
    const total = texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0);
    return ok(total);
  },
};

/**
 * Word-based approximation: splits on whitespace, counts tokens as words * 1.3.
 */
export const wordApproxCounter: TokenCounter = {
  async count(text: string): Promise<Result<number, CounterUnavailableError>> {
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    return ok(Math.ceil(words * 1.3));
  },
  async countMany(texts: readonly string[]): Promise<Result<number, CounterUnavailableError>> {
    let total = 0;
    for (const t of texts) {
      const words = t.trim() === "" ? 0 : t.trim().split(/\s+/).length;
      total += Math.ceil(words * 1.3);
    }
    return ok(total);
  },
};

/** Wraps a counter with a fixed per-call overhead for message framing tokens. */
export function withFramingOverhead(
  inner: TokenCounter,
  overheadPerMessage = 4,
): TokenCounter {
  return {
    async count(text: string) {
      const r = await inner.count(text);
      if (r.ok) return ok(r.value + overheadPerMessage);
      return r;
    },
    async countMany(texts: readonly string[]) {
      const r = await inner.countMany(texts);
      if (r.ok) return ok(r.value + overheadPerMessage * texts.length);
      return r;
    },
  };
}
