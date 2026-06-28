// Context compaction: summarises a slice of turns to reduce token usage.
import { type Result, ok, err } from "@veritas/core";
import type { Turn } from "./types.js";
import { CompactionError } from "./errors.js";

export interface CompactionStrategy {
  /** Compact a sequence of turns into a single summary turn. */
  compact(turns: readonly Turn[]): Promise<Result<Turn, CompactionError>>;
}

/** Simple concatenation compactor — joins content with separators (no LLM call). */
export const concatenationCompactor: CompactionStrategy = {
  async compact(turns: readonly Turn[]): Promise<Result<Turn, CompactionError>> {
    if (turns.length === 0) {
      return err(new CompactionError("Cannot compact an empty turn list"));
    }

    const content = turns
      .map((t) => `[${t.role}]: ${t.content}`)
      .join("\n");

    const summary: Turn = Object.freeze({
      id: `compact-${Date.now()}`,
      role: "assistant",
      content: `<summary>\n${content}\n</summary>`,
      createdAt: Date.now(),
      pinned: false,
      priority: 0.8,
    });

    return ok(summary);
  },
};

/**
 * Compacts runs of turns that exceed a token threshold into summary turns.
 * Pinned turns are never compacted.
 */
export async function compactTurns(
  turns: readonly Turn[],
  maxTokensPerTurn: number,
  strategy: CompactionStrategy = concatenationCompactor,
): Promise<Result<readonly Turn[], CompactionError>> {
  const result: Turn[] = [];
  let pending: Turn[] = [];

  const flushPending = async (): Promise<Result<void, CompactionError>> => {
    if (pending.length === 0) return ok(undefined);
    const r = await strategy.compact(pending);
    if (!r.ok) return err(r.error);
    result.push(r.value);
    pending = [];
    return ok(undefined);
  };

  for (const turn of turns) {
    if (turn.pinned) {
      const flush = await flushPending();
      if (!flush.ok) return err(flush.error);
      result.push(turn);
      continue;
    }

    const tokens = turn.tokenCount ?? Math.ceil(turn.content.length / 4);
    if (tokens > maxTokensPerTurn) {
      pending.push(turn);
    } else {
      const flush = await flushPending();
      if (!flush.ok) return err(flush.error);
      result.push(turn);
    }
  }

  const flush = await flushPending();
  if (!flush.ok) return err(flush.error);

  return ok(result);
}
