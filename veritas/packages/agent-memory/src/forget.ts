// Memory forgetting — decay-based and policy-based eviction of stale or low-value memories.

import { ok, err, isOk, epochToIso } from "@veritas/core";
import type { Result } from "@veritas/core";
import type { MemoryStore, MemoryFilter } from "./store.js";
import type { Memory } from "./memory.js";
import type { MemoryKind } from "./memory.js";
import { effectiveImportance, withDecay } from "./memory.js";
import { DEFAULT_DECAY_CONFIG } from "./types.js";
import type { DecayConfig } from "./types.js";

export interface ForgetOptions {
  readonly agentId: string;
  readonly olderThanDays?: number;
  readonly belowImportance?: number;
  readonly belowDecayFactor?: number;
  readonly kind?: MemoryKind;
  readonly dryRun?: boolean;
}

export interface ForgetResult {
  readonly candidateCount: number;
  readonly forgottenCount: number;
  readonly dryRun: boolean;
  readonly forgottenIds: ReadonlyArray<string>;
}

function isExpired(memory: Memory, now: string): boolean {
  return memory.expiresAt !== undefined && memory.expiresAt < now;
}

function meetsForgetCriteria(memory: Memory, options: ForgetOptions, nowMs: number): boolean {
  if (options.olderThanDays !== undefined) {
    const createdMs = new Date(memory.createdAt).getTime();
    const ageDays = (nowMs - createdMs) / (1000 * 60 * 60 * 24);
    if (ageDays >= options.olderThanDays) return true;
  }
  if (options.belowImportance !== undefined && effectiveImportance(memory) < options.belowImportance) {
    return true;
  }
  if (options.belowDecayFactor !== undefined && memory.decayFactor < options.belowDecayFactor) {
    return true;
  }
  return false;
}

export async function forgetMemories(
  store: MemoryStore,
  options: ForgetOptions,
): Promise<Result<ForgetResult>> {
  const filter: MemoryFilter = {
    agentId: options.agentId,
    kind: options.kind,
  };

  const listResult = await store.list(filter, { limit: 1000 });
  if (!isOk(listResult)) return err(listResult.error);

  const now = new Date().toISOString();
  const nowMs = Date.now();

  const candidates = listResult.value.items.filter(
    (m) => isExpired(m, now) || meetsForgetCriteria(m, options, nowMs),
  );

  if (options.dryRun) {
    return ok({
      candidateCount: candidates.length,
      forgottenCount: 0,
      dryRun: true,
      forgottenIds: candidates.map((m) => m.id),
    });
  }

  const ids = candidates.map((m) => m.id);
  if (ids.length === 0) {
    return ok({ candidateCount: 0, forgottenCount: 0, dryRun: false, forgottenIds: [] });
  }

  let forgottenCount = 0;
  const forgottenIds: string[] = [];

  for (const id of ids) {
    const deleteResult = await store.delete(id);
    if (isOk(deleteResult)) {
      forgottenIds.push(id);
      forgottenCount++;
    }
  }

  return ok({
    candidateCount: candidates.length,
    forgottenCount,
    dryRun: false,
    forgottenIds,
  });
}

export async function applyDecay(
  store: MemoryStore,
  agentId: string,
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): Promise<Result<number>> {
  const filter: MemoryFilter = { agentId };
  const listResult = await store.list(filter, { limit: 1000 });
  if (!isOk(listResult)) return err(listResult.error);

  const now = epochToIso(Date.now());
  const decayPerDay = Math.pow(0.5, 1 / config.halfLifeDays);
  let updatedCount = 0;

  for (const memory of listResult.value.items) {
    const lastAccessed = memory.lastAccessedAt ?? memory.updatedAt;
    const daysSince =
      (new Date(now).getTime() - new Date(lastAccessed).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < 1) continue;

    const factor = Math.pow(decayPerDay, daysSince);
    const decayed = withDecay(memory, factor);

    if (decayed.decayFactor < config.purgeThreshold) {
      await store.delete(memory.id);
    } else {
      const updateResult = await store.update(memory.id, {
        decayFactor: decayed.decayFactor,
        updatedAt: now,
      });
      if (isOk(updateResult)) updatedCount++;
    }
  }

  return ok(updatedCount);
}
