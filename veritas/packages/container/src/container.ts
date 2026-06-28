// Tiny type-safe DI container backed by a symbol-keyed Map.

import type { Token } from "./tokens.js";

/** Factory function that produces a value for a given token. */
export type Factory<T> = (c: Container) => T;

/** Binding descriptor stored per token. */
interface Binding<T> {
  readonly factory: Factory<T>;
  singleton: boolean;
  instance: T | undefined;
}

/** Lightweight synchronous DI container. */
export class Container {
  private readonly bindings = new Map<symbol, Binding<unknown>>();

  /**
   * Register a singleton: the factory is called at most once and the result
   * is cached for subsequent calls.
   */
  singleton<T>(token: Token<T>, factory: Factory<T>): this {
    this.bindings.set(token as symbol, { factory, singleton: true, instance: undefined });
    return this;
  }

  /**
   * Register a transient: the factory is called on every resolve.
   */
  transient<T>(token: Token<T>, factory: Factory<T>): this {
    this.bindings.set(token as symbol, { factory, singleton: false, instance: undefined });
    return this;
  }

  /**
   * Register an already-constructed instance as a singleton.
   */
  value<T>(token: Token<T>, instance: T): this {
    this.bindings.set(token as symbol, {
      factory: () => instance,
      singleton: true,
      instance,
    });
    return this;
  }

  /**
   * Resolve a registered token, throwing if not registered.
   */
  resolve<T>(token: Token<T>): T {
    const sym = token as symbol;
    const binding = this.bindings.get(sym) as Binding<T> | undefined;
    if (!binding) {
      throw new Error(`Container: no binding found for token "${sym.toString()}"`);
    }
    if (binding.singleton) {
      if (binding.instance === undefined) {
        (binding as Binding<T>).instance = binding.factory(this);
      }
      return binding.instance as T;
    }
    return binding.factory(this);
  }

  /**
   * Alias for singleton — registers a factory that is called at most once.
   * Provided for compatibility with module code that uses `register(...)`.
   */
  register<T>(token: Token<T>, factory: Factory<T>): this {
    return this.singleton(token, factory);
  }

  /**
   * Try to resolve a registered token.
   * Returns the resolved value, or undefined when the token is not registered.
   */
  tryResolve<T>(token: Token<T>): T | undefined {
    if (!this.has(token)) return undefined;
    return this.resolve(token);
  }

  /** Returns true when a token has been registered. */
  has(token: Token<unknown>): boolean {
    return this.bindings.has(token as symbol);
  }
}
