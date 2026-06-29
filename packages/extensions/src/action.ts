// Action hooks: fire-and-forget side-effect handlers called in priority order.
import { HookExecutionError } from "./errors.js";
import { insertSorted, Priority } from "./priority.js";
import type { HookName, ExtensionId, ActionEntry, ActionFn } from "./types.js";

/** Bus for action hooks — side effects only, no return value propagation. */
export class ActionBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly #actions = new Map<HookName, ActionEntry<any>[]>();

  /** Register an action for a named hook. */
  addAction<T>(
    hookName: HookName,
    action: ActionFn<T>,
    extensionId: ExtensionId,
    priority: number = Priority.NORMAL,
  ): void {
    const entry: ActionEntry<T> = { action, extensionId, priority };
    const existing = (this.#actions.get(hookName) ?? []) as ActionEntry<T>[];
    this.#actions.set(hookName, insertSorted(existing, entry));
  }

  /** Remove all actions registered by a specific extension for a hook. */
  removeAction(hookName: HookName, extensionId: ExtensionId): void {
    const entries = this.#actions.get(hookName);
    if (!entries) return;
    const filtered = entries.filter((e) => e.extensionId !== extensionId);
    if (filtered.length === 0) {
      this.#actions.delete(hookName);
    } else {
      this.#actions.set(hookName, filtered);
    }
  }

  /**
   * Dispatch a value to all registered actions for a hook.
   * All actions are awaited sequentially in priority order.
   * Errors from individual actions are collected and re-thrown after all run.
   */
  async dispatch<T>(hookName: HookName, value: T): Promise<void> {
    const entries = (this.#actions.get(hookName) ?? []) as ActionEntry<T>[];
    const errors: HookExecutionError[] = [];

    for (const { action, extensionId } of entries) {
      try {
        await Promise.resolve(action(value));
      } catch (cause) {
        errors.push(new HookExecutionError(`${hookName}@${extensionId}`, cause));
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new HookExecutionError(
        `${hookName} — ${errors.length} actions failed`,
        errors,
      );
    }
  }

  /**
   * Dispatch a value to all registered actions for a hook in parallel.
   * Errors are aggregated and re-thrown after all settle.
   */
  async dispatchParallel<T>(hookName: HookName, value: T): Promise<void> {
    const entries = (this.#actions.get(hookName) ?? []) as ActionEntry<T>[];
    const results = await Promise.allSettled(
      entries.map(({ action, extensionId }) =>
        Promise.resolve(action(value)).catch((cause: unknown) => {
          throw new HookExecutionError(`${hookName}@${extensionId}`, cause);
        }),
      ),
    );

    const failures = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    if (failures.length === 1) {
      throw failures[0]!.reason as HookExecutionError;
    }
    if (failures.length > 1) {
      throw new HookExecutionError(
        `${hookName} — ${failures.length} parallel actions failed`,
        failures.map((f) => f.reason),
      );
    }
  }

  /** Number of actions registered for a named hook. */
  count(hookName: HookName): number {
    return this.#actions.get(hookName)?.length ?? 0;
  }
}
