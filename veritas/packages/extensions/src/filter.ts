// Filter hooks: gate a value through registered boolean predicates in priority order.
import { insertSorted, Priority } from "./priority.js";
import type { HookName, ExtensionId, FilterEntry, FilterFn } from "./types.js";

export interface FilterResult {
  readonly allowed: boolean;
  readonly blockedBy?: ExtensionId;
}

/** Registry of named filter hooks that accept/reject a value. */
export class FilterBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly #filters = new Map<HookName, FilterEntry<any>[]>();

  /** Register a filter predicate for a named hook. */
  addFilter<T>(
    hookName: HookName,
    filter: FilterFn<T>,
    extensionId: ExtensionId,
    priority: number = Priority.NORMAL,
  ): void {
    const entry: FilterEntry<T> = { filter, extensionId, priority };
    const existing = (this.#filters.get(hookName) ?? []) as FilterEntry<T>[];
    this.#filters.set(hookName, insertSorted(existing, entry));
  }

  /** Remove all filters registered by a specific extension for a hook. */
  removeFilter(hookName: HookName, extensionId: ExtensionId): void {
    const entries = this.#filters.get(hookName);
    if (!entries) return;
    const filtered = entries.filter((e) => e.extensionId !== extensionId);
    if (filtered.length === 0) {
      this.#filters.delete(hookName);
    } else {
      this.#filters.set(hookName, filtered);
    }
  }

  /**
   * Run value through all filters for a hook.
   * Returns allowed=true only if every filter passes.
   * Short-circuits on the first rejection.
   */
  async apply<T>(hookName: HookName, value: T): Promise<FilterResult> {
    const entries = (this.#filters.get(hookName) ?? []) as FilterEntry<T>[];
    for (const { filter, extensionId } of entries) {
      const passed = await Promise.resolve(filter(value));
      if (!passed) {
        return { allowed: false, blockedBy: extensionId };
      }
    }
    return { allowed: true };
  }

  /** Number of filters registered for a named hook. */
  count(hookName: HookName): number {
    return this.#filters.get(hookName)?.length ?? 0;
  }
}
