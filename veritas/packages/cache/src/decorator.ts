// cached() method decorator — wraps a class method with cache-aside lookup.
import { isSome } from "@veritas/core";
import type { Cache } from "./cache.js";

export interface CachedOptions<A extends readonly unknown[]> {
  readonly cache: Cache<unknown>;
  readonly ttlMs?: number;
  readonly keyFn?: (methodName: string, args: A) => string;
}

const defaultKeyFn = (methodName: string, args: readonly unknown[]): string =>
  `${methodName}:${JSON.stringify(args)}`;

/**
 * Method decorator factory that wraps the decorated async method with cache-aside logic.
 * Usage:
 *   @cached({ cache: myCache, ttlMs: 60_000 })
 *   async fetchData(id: string): Promise<Data> { ... }
 */
export function cached<A extends readonly unknown[], R>(
  options: CachedOptions<A>,
): (
  target: object,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<(...args: A) => Promise<R>>,
) => TypedPropertyDescriptor<(...args: A) => Promise<R>> {
  return (
    _target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: A) => Promise<R>>,
  ): TypedPropertyDescriptor<(...args: A) => Promise<R>> => {
    const original = descriptor.value;
    if (typeof original !== "function") {
      throw new TypeError(
        `@cached can only decorate async methods, got ${typeof original}`,
      );
    }

    descriptor.value = async function cachedMethod(
      this: unknown,
      ...args: A
    ): Promise<R> {
      const keyFn = options.keyFn ?? defaultKeyFn;
      const key = keyFn(propertyKey, args);
      const hit = await options.cache.get(key);
      if (isSome(hit)) {
        return hit.value as R;
      }
      const result = await (original as unknown as (...a: unknown[]) => Promise<R>).apply(this, args as unknown as unknown[]);
      await options.cache.set(key, result, options.ttlMs);
      return result;
    };

    return descriptor;
  };
}
