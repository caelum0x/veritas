// Compute the ordered list of pending (not-yet-applied) migrations
import type { Migration } from "./migration.js";
import type { StateStore } from "./state-store.js";

export interface MigrationPlan {
  readonly pending: readonly Migration[];
  readonly applied: readonly string[];
}

/** Returns migrations that have not yet been recorded in the state store. */
export async function computePlan(
  registry: readonly Migration[],
  stateStore: StateStore
): Promise<MigrationPlan> {
  const appliedRecords = await stateStore.listApplied();
  const appliedIds = appliedRecords.map((r) => r.id);
  const appliedSet = new Set(appliedIds);
  const pending = registry.filter((m) => !appliedSet.has(m.id));
  return { pending, applied: appliedIds };
}
