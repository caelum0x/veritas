// Branded primitive types for nominal typing without runtime overhead.

declare const __brand: unique symbol;

/** A nominal brand applied to a base type `T` with unique tag `B`. */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Cast a raw value into its branded form (use only at trusted boundaries). */
export function brand<T, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>;
}

/** Strip the brand back to the underlying base type. */
export function unbrand<T, B extends string>(value: Brand<T, B>): T {
  return value as T;
}
