// Sync/async hook bus: dispatches values through registered handlers in priority order.
import { HookExecutionError } from "./errors.js";
import { insertSorted, Priority } from "./priority.js";
import type { HookName, ExtensionId, HookEntry, Handler } from "./types.js";

/** Hook bus that supports both synchronous and async transform handlers. */
export class HookBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly #hooks = new Map<HookName, HookEntry<any>[]>();

  /** Register a handler for a named hook. */
  on<T>(
    hookName: HookName,
    handler: Handler<T>,
    extensionId: ExtensionId,
    priority: number = Priority.NORMAL,
  ): void {
    const entry: HookEntry<T> = { handler, extensionId, priority };
    const existing = (this.#hooks.get(hookName) ?? []) as HookEntry<T>[];
    this.#hooks.set(hookName, insertSorted(existing, entry));
  }

  /** Remove all handlers registered by a specific extension for a hook. */
  off(hookName: HookName, extensionId: ExtensionId): void {
    const entries = this.#hooks.get(hookName);
    if (!entries) return;
    const filtered = entries.filter((e) => e.extensionId !== extensionId);
    if (filtered.length === 0) {
      this.#hooks.delete(hookName);
    } else {
      this.#hooks.set(hookName, filtered);
    }
  }

  /**
   * Run a value through all async handlers registered for a hook.
   * Each handler receives the output of the previous one (pipeline).
   */
  async applyAsync<T>(hookName: HookName, initial: T): Promise<T> {
    const entries = (this.#hooks.get(hookName) ?? []) as HookEntry<T>[];
    let current = initial;
    for (const { handler, extensionId } of entries) {
      try {
        current = await Promise.resolve(handler(current));
      } catch (cause) {
        throw new HookExecutionError(`${hookName}@${extensionId}`, cause);
      }
    }
    return current;
  }

  /**
   * Run a value through all sync handlers registered for a hook.
   * Throws if any handler returns a Promise.
   */
  applySync<T>(hookName: HookName, initial: T): T {
    const entries = (this.#hooks.get(hookName) ?? []) as HookEntry<T>[];
    let current = initial;
    for (const { handler, extensionId } of entries) {
      const result = handler(current);
      if (result instanceof Promise) {
        throw new HookExecutionError(
          `${hookName}@${extensionId}`,
          new Error("Async handler used in sync context"),
        );
      }
      current = result;
    }
    return current;
  }

  /** Number of handlers registered for a hook. */
  count(hookName: HookName): number {
    return this.#hooks.get(hookName)?.length ?? 0;
  }

  /** All hook names that have at least one handler. */
  activeHooks(): ReadonlyArray<HookName> {
    return [...this.#hooks.keys()];
  }
}
