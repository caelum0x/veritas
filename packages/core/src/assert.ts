// Assertion helpers for invariants and exhaustiveness checks.

/** Error thrown when an invariant is violated. */
export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvariantError";
  }
}

/** Throw if the condition is falsy; narrows the type otherwise. */
export function invariant(
  condition: unknown,
  message = "Invariant violation",
): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}

/** Assert a value is not null/undefined and return it narrowed. */
export function assertDefined<T>(
  value: T | null | undefined,
  message = "Expected value to be defined",
): T {
  if (value === null || value === undefined) {
    throw new InvariantError(message);
  }
  return value;
}

/** Exhaustiveness guard for switch statements; never returns at runtime. */
export function assertNever(value: never, message?: string): never {
  throw new InvariantError(
    message ?? `Unexpected value: ${JSON.stringify(value)}`,
  );
}
