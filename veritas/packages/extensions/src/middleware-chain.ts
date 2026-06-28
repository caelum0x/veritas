// Composable middleware chain: wraps each handler around the next (onion model).
import { MiddlewareError } from "./errors.js";
import { insertSorted, Priority } from "./priority.js";
import type { ExtensionId, Prioritized } from "./types.js";

export type Next<T> = () => Promise<T>;
export type MiddlewareFn<T> = (value: T, next: Next<T>) => Promise<T>;

interface MiddlewareEntry<T> extends Prioritized {
  readonly middleware: MiddlewareFn<T>;
  readonly extensionId: ExtensionId;
  readonly priority: number;
}

/** Builds an ordered middleware chain and executes it around a final handler. */
export class MiddlewareChain<T> {
  #entries: MiddlewareEntry<T>[] = [];

  /** Add a middleware to the chain. */
  use(
    middleware: MiddlewareFn<T>,
    extensionId: ExtensionId,
    priority: number = Priority.NORMAL,
  ): void {
    const entry: MiddlewareEntry<T> = { middleware, extensionId, priority };
    this.#entries = insertSorted(this.#entries, entry);
  }

  /** Remove all middleware registered by a specific extension. */
  remove(extensionId: ExtensionId): void {
    this.#entries = this.#entries.filter((e) => e.extensionId !== extensionId);
  }

  /**
   * Execute the chain for a given value, with `core` as the innermost function.
   * Middleware wraps outward in priority order (lowest priority runs outermost).
   */
  async run(value: T, core: (v: T) => Promise<T>): Promise<T> {
    const entries = [...this.#entries];

    const build = (index: number, current: T): Promise<T> => {
      if (index >= entries.length) {
        return core(current);
      }
      const { middleware, extensionId } = entries[index]!;
      const next: Next<T> = () => build(index + 1, current);
      return middleware(current, next).catch((cause: unknown) => {
        throw new MiddlewareError(
          `Middleware[${index}]@${extensionId} failed`,
          cause,
        );
      });
    };

    return build(0, value);
  }

  /** Number of middleware in the chain. */
  get size(): number {
    return this.#entries.length;
  }
}
