// Memory summarization — condenses a set of memories into a single summary memory record.

import { ok, err, isOk, newId, epochToIso } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { VerifierLLM } from "@veritas/llm";
import type { MemoryStore, MemoryFilter } from "./store.js";
import type { Memory } from "./memory.js";
import type { MemoryKind } from "./memory.js";
import { effectiveImportance } from "./memory.js";

export interface SummarizeOptions {
  readonly agentId: string;
  readonly kind?: MemoryKind;
  readonly sessionId?: string;
  readonly maxMemories?: number;
  readonly summaryKind?: MemoryKind;
  readonly importanceBoost?: number;
}

export interface SummarizeResult {
  readonly summary: Memory;
  readonly sourceCount: number;
  readonly sourceIds: ReadonlyArray<string>;
}

function buildSummaryText(memories: ReadonlyArray<Memory>): string {
  return memories
    .map((m, i) => `[${i + 1}] (${m.kind}) ${m.content}`)
    .join("\n");
}

export async function summarizeMemories(
  store: MemoryStore,
  llm: VerifierLLM,
  options: SummarizeOptions,
): Promise<Result<SummarizeResult>> {
  const filter: MemoryFilter = {
    agentId: options.agentId,
    kind: options.kind,
    sessionId: options.sessionId,
    excludeExpired: true,
  };

  const listResult = await store.list(filter, { limit: options.maxMemories ?? 50 });
  if (!isOk(listResult)) return err(listResult.error);

  const memories = [...listResult.value.items].sort(
    (a, b) => effectiveImportance(b) - effectiveImportance(a),
  );

  if (memories.length === 0) {
    return err(new Error("No memories available for summarization") as never);
  }

  const bodyText = buildSummaryText(memories);
  const prompt = `Summarize the following agent memory entries into a single concise paragraph that captures the key information:\n\n${bodyText}`;

  const extractResult = await llm.extractClaims(prompt);
  if (!isOk(extractResult)) return err(extractResult.error as never);

  const summaryContent =
    extractResult.value.claims.length > 0
      ? extractResult.value.claims.map((c) => c.text).join(" ")
      : bodyText.slice(0, 500);

  const now = epochToIso(Date.now());
  const sourceIds = memories.map((m) => m.id);
  const avgImportance =
    memories.reduce((sum, m) => sum + effectiveImportance(m), 0) / memories.length;

  const summaryToSave = {
    id: newId("mem"),
    agentId: options.agentId,
    kind: (options.summaryKind ?? "episodic") as MemoryKind,
    content: summaryContent,
    importance: Math.min(1, avgImportance + (options.importanceBoost ?? 0.1)),
    metadata: { summarizedCount: memories.length, sessionId: options.sessionId },
    tags: ["summary"],
    sourceMemoryIds: sourceIds,
    sessionId: options.sessionId,
    createdAt: now,
    updatedAt: now,
  };

  const saveResult = await store.save(summaryToSave);
  if (!isOk(saveResult)) return err(saveResult.error);

  return ok({
    summary: saveResult.value,
    sourceCount: memories.length,
    sourceIds,
  });
}
